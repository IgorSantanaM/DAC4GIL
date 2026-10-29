using DAC4GIL.Domain.Core.Model;
using DAC4GIL.Domain.Matriculas;
using DAC4GIL.Infra.Data.Contexts;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;

namespace DAC4GIL.Infra.Data.Repositories
{
    public class MatriculaRepository(DACContext context) : Repository<Matricula, int>(context), IMatriculaRepository
    {
        public Task<bool> ExistsForYearsAsync(int[] years, CancellationToken cancellationToken = default)
            => context.Matriculas.AnyAsync(m => years.Contains(m.AnoReferencia), cancellationToken);

        public async Task<PagedResult<Matricula>> GetPagedResultAsync(
            int pageNumber,
            int pageSize,
            string? searchTerm = null,
            CancellationToken cancellationToken = default)
        {
            pageNumber = Math.Max(1, pageNumber);
            pageSize = Math.Clamp(pageSize, 1, 100);

            IQueryable<Matricula> query = context.Set<Matricula>()
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var term = searchTerm.Trim();

                query = query.Where(m => m.NomeUnidadeEscolar.Contains(term));
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var items = await query
                .OrderBy(m => m.Id)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            return new PagedResult<Matricula>
            {
                Items = items,
                TotalCount = totalCount,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
                CurrentPage = pageNumber
            };
        }
    }
}
