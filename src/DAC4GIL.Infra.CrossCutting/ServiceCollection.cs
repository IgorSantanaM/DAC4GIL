using DAC4GIL.Domain.Core.Repository;
using DAC4GIL.Domain.Matriculas;
using DAC4GIL.Infra.Data.Contexts;
using DAC4GIL.Infra.Data.Repositories;
using DAC4GIL.Infra.Data.UoW;
using EasyNetQ;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace DAC4GIL.Infra.CrossCutting;

public static class ServiceCollection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var postgres = configuration.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException("ConnectionStrings:Postgres não configurada.");

        var rabbit = configuration.GetConnectionString("RabbitMQ")
            ?? throw new InvalidOperationException("ConnectionStrings:RabbitMQ não configurada.");

        services.AddDbContext<DACContext>(options => options.UseNpgsql(postgres));

        services.AddScoped<IMatriculaRepository, MatriculaRepository>();

        services.AddScoped<IUnitOfWork, UnitOfWork>();

        services.AddEasyNetQ(rabbit);

        return services;
    }
}
