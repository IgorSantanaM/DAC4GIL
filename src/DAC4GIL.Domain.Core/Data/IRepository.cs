using DAC4GIL.Domain.Core.Model;
using System;
using System.Collections.Generic;
using System.Text;

namespace DAC4GIL.Domain.Core.Repository
{
    public interface IRepository<TEntity, TId> where TEntity : class, IAggregateRoot where TId : notnull
    {
        public Task<TEntity?> GetByIdAsync(TId id, CancellationToken cancellationToken = default);
        public Task AddAsync(TEntity entity, CancellationToken cancellationToken = default);
        public void Update(TEntity entity);
        public void Delete(TEntity entity); 
    }
}
