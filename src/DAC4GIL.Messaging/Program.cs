using DAC4GIL.Infra.CrossCutting;
using DAC4GIL.Infra.Data.Contexts;
using DAC4GIL.Messaging;
using Microsoft.EntityFrameworkCore;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddHostedService<Worker>();
var host = builder.Build();
// Inicialização do esquema para desenvolvimento local, sem migrations existentes.
if (host.Services.GetRequiredService<IHostEnvironment>().IsDevelopment())
{
    using var scope = host.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<DACContext>().Database.MigrateAsync();
}
await host.RunAsync();
