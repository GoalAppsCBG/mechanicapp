using Dapper;
using Npgsql;
using System.Data;

namespace MechanicApp.Server.Services
{
    /// <summary>
    /// Dapper-based data access service backed by an NpgsqlDataSource connection pool.
    /// </summary>
    public class DbService(NpgsqlDataSource dataSource) : IDbService
    {
        /// <inheritdoc />
        public async Task<T?> GetAsync<T>(string command, object parms)
        {
            using var connection = dataSource.CreateConnection();
            return await connection.QueryFirstOrDefaultAsync<T>(command, parms).ConfigureAwait(false);
        }

        /// <inheritdoc />
        public async Task<List<T>> GetAll<T>(string command, object parms)
        {
            using var connection = dataSource.CreateConnection();
            var result = await connection.QueryAsync<T>(command, parms).ConfigureAwait(false);
            return result.ToList();
        }

        /// <inheritdoc />
        public async Task<int> EditData(string command, object parms)
        {
            using var connection = dataSource.CreateConnection();
            return await connection.ExecuteAsync(command, parms).ConfigureAwait(false);
        }

        /// <inheritdoc />
        public async Task ExecuteInTransactionAsync(Func<IDbConnection, IDbTransaction, Task> action)
        {
            using var connection = dataSource.CreateConnection();
            await connection.OpenAsync().ConfigureAwait(false);
            using var transaction = await connection.BeginTransactionAsync().ConfigureAwait(false);
            try
            {
                await action(connection, transaction).ConfigureAwait(false);
                await transaction.CommitAsync().ConfigureAwait(false);
            }
            catch
            {
                await transaction.RollbackAsync().ConfigureAwait(false);
                throw;
            }
        }
    }
}
