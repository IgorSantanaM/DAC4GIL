using DAC4GIL.Domain.Core.Repository;
using DAC4GIL.Infra.Data.Contexts;

namespace DAC4GIL.Infra.Data.UoW
{
    public class UnitOfWork(DACContext context) : IUnitOfWork, IDisposable
    {
        private bool _disposed = false;
        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return context.SaveChangesAsync(cancellationToken);
        }
        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        private void Dispose(bool disposing)
        {
            if (!_disposed)
            {
                if (disposing)
                {
                    context.Dispose();
                }
                _disposed = true;
            }
        }
    }
}
