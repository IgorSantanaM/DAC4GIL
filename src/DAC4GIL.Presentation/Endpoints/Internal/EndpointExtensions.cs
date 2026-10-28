using System.Reflection;
using System.Runtime.CompilerServices;

namespace DAC4GIL.Presentation.Endpoints.Internal
{
    public static class EndpointExtensions
    {
        public static void UseEndpoints<TMarker>(this WebApplication app)
            => UseEndpoints(app, typeof(TMarker));

        private static void UseEndpoints(WebApplication app, Type type)
        {
            IEnumerable<TypeInfo> endpointType = GetEndpointTypesFromAssemblyContainingType(type);

            foreach(TypeInfo endpoint in endpointType)
                endpoint.GetMethod(nameof(IEndpoints.DefineEndpoints))?.Invoke(null, [app]);
        }

        private static IEnumerable<TypeInfo> GetEndpointTypesFromAssemblyContainingType(Type type)
            => type.Assembly.DefinedTypes.Where(x => !x.IsAbstract && !x.IsInterface && typeof(IEndpoints).IsAssignableFrom(x));
    }
}
