namespace DAC4GIL.Domain.Core.Model
{
    public class PagedResult<TEntity> where TEntity : class
    {
        public IEnumerable<TEntity> Items { get; set; } = Enumerable.Empty<TEntity>();
        public int TotalPages { get; set; }
        public int TotalCount { get; set; }
        public int CurrentPage { get; set; }
    }
}
