using DAC4GIL.Domain.Core.Model;
using DAC4GIL.Domain.Core.Repository;
using DAC4GIL.Domain.Matriculas;

namespace DAC4GIL.Domain.Matriculas
{
    public interface IMatriculaRepository : IRepository<Matricula, int>
    {
        public Task<PagedResult<Matricula>> GetPagedResultAsync(int pageNumber, int pageSize, string? searchTerm = null, CancellationToken cancellationToken = default);
    }
}
