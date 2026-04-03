# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["MechanicApp.Server.csproj", "."]
RUN dotnet restore "./MechanicApp.Server.csproj"
COPY . .
WORKDIR "/src/."
RUN dotnet build "MechanicApp.Server.csproj" -c Release -o /app/build
RUN dotnet publish "MechanicApp.Server.csproj" -c Release -o /app/publish

# Serve Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 80
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "MechanicApp.Server.dll"]
