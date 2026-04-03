using System.Text;
using Dapper;
using MechanicApp.Server.Middleware;
using MechanicApp.Server.Options;
using MechanicApp.Server.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Scalar.AspNetCore;

// Register Dapper type handler for DateOnly (not natively supported by Dapper)
SqlMapper.AddTypeHandler(new DateOnlyTypeHandler());

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularDev",
        policy =>
        {
            policy.WithOrigins(
                    "http://localhost:4200",
                    "http://localhost:5236")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// Strongly-typed settings
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection(JwtSettings.SectionName));
builder.Services.Configure<HotmartSettings>(builder.Configuration.GetSection(HotmartSettings.SectionName));

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.Zero // No tolerance for token expiration
    };
});

builder.Services.AddAuthorization();
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.SuppressModelStateInvalidFilter = true;
    });

// Register NpgsqlDataSource as singleton (connection pool)
var connString = builder.Configuration.GetConnectionString("DefaultConnection")!;
var dataSourceBuilder = new NpgsqlDataSourceBuilder(connString);
builder.Services.AddSingleton(dataSourceBuilder.Build());

// Register services (DI)
builder.Services.AddScoped<IDbService, DbService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IFileStorageService, FileStorageService>();
builder.Services.AddScoped<IOrderCalculationService, OrderCalculationService>();
builder.Services.AddScoped<ICurrencyConversionService, CurrencyConversionService>();
builder.Services.AddScoped<IPaymentDistributionService, PaymentDistributionService>();

// OpenAPI document generation (built-in .NET 10)
builder.Services.AddOpenApi();

var app = builder.Build();

// Enable OpenAPI + Scalar interactive API docs in all environments
app.MapOpenApi();
app.MapScalarApiReference(options =>
{
    options
        .WithTitle("MechanicApp API")
        .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
});

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseCors("AllowAngularDev");

// Serve uploaded files (logos, photos, etc.)
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

// Check subscription status before allowing API access
app.UseMiddleware<SubscriptionMiddleware>();

app.MapControllers();

app.Run();
