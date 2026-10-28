namespace DAC4GIL.Domain.Core.Exceptions
{
    public class DomainExceptions : Exception
    {
        public DomainExceptions() : base() { }
        public DomainExceptions(string message) : base(message) { }
    }
}
