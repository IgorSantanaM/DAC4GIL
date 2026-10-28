using DAC4GIL.Domain.Core.Repository;
using DAC4GIL.Domain.Matriculas;
using DAC4GIL.Messaging.DTOs;
using EasyNetQ;

namespace DAC4GIL.Messaging
{
    public class Worker(IServiceProvider service) : BackgroundService
    {
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = service.CreateScope();
                    var bus = scope.ServiceProvider.GetRequiredService<IBus>();

                    await bus.PubSub.SubscribeAsync<List<GenericMessageDTO>>("matriculas",
                        async data => await AddToDatabase(data, stoppingToken));
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error: {ex.Message}");
                }
            }
        }

        private async Task AddToDatabase(List<GenericMessageDTO> data, CancellationToken stoppingToken)
        {
            using var scope = service.CreateScope();
            var matriculaRepository = scope.ServiceProvider.GetRequiredService<IMatriculaRepository>();
            var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
            foreach (var item in data)
            {
                var matricula = new Matricula(item.AnoReferencia,
                     item.NomeMunicipio,
                    item.NomeUnidadeEscolar,
                    item.MatriculasTotal,
                    item.MatriculaInicial,
                    item.MatriculaAposCenso,
                    item.Transferidos,
                    item.Cancelados,
                    item.Falecido,
                    item.Abandono,
                    item.Aprovados,
                    item.Reprovados,
                    item.Cursando,
                    item.OutrasSituacoes);
                await matriculaRepository.AddAsync(matricula);
            }
            await unitOfWork.SaveChangesAsync(stoppingToken);
        }
    }
}
