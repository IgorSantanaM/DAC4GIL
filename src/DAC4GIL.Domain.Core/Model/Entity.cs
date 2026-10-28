namespace DAC4GIL.Domain.Core.Model
{
    public abstract class Entity<TId> where TId : notnull
    {
        public TId? Id { get; protected set; }
        public override bool Equals(object? obj)
        {
            var entity = obj as Entity<TId>;

            if (ReferenceEquals(entity, null) && ReferenceEquals(this, null)) return true;
            if (ReferenceEquals(entity, null) || ReferenceEquals(this, null)) return false;
            return EqualityComparer<TId>.Default.Equals(Id, entity.Id);
        }
        public static bool operator ==(Entity<TId> entityA, Entity<TId> entityB)
        {
            if (ReferenceEquals(entityA, null) && ReferenceEquals(entityB, null)) return true;
            if (ReferenceEquals(entityA, null) || ReferenceEquals(entityB, null)) return false;

            return entityA.Equals(entityB);
        }

        public static bool operator !=(Entity<TId> entityA, Entity<TId> entityB)
            => !(entityA == entityB);

        public override int GetHashCode()
            => HashCode.Combine(GetType(), Id);
    }
}
