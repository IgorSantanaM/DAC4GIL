using DAC4GIL.Messaging.DTOs;
using EasyNetQ;
using DAC4GIL.Domain.Matriculas;
using MediatR;

namespace DAC4GIL.Application.Features.Matriculas.Commands
{
    public class CreateMatriculaCommandHandler(IBus bus, IMatriculaRepository repository) : IRequestHandler<CreateMatriculaCommand, ImportMatriculasResult>
    {
        public async Task<ImportMatriculasResult> Handle(CreateMatriculaCommand request, CancellationToken cancellationToken)
        {
            var years = request.Matriculas.Select(x => x.AnoReferencia).Distinct().ToArray();
            if (await repository.ExistsForYearsAsync(years, cancellationToken))
                return ImportMatriculasResult.YearAlreadyExists;

            var messageQueue = request.Matriculas.Select(x => new GenericMessageDTO(x.AnoReferencia,
                x.NomeMunicipio,
                x.NomeUnidadeEscolar,
                x.MatriculasTotal,
                x.MatriculaInicial,
                x.MatriculaAposCenso,
                x.Transferidos,
                x.Cancelados,
                x.Falecido,
                x.Abandono,
                x.Aprovados,
                x.Reprovados,
                x.Cursando,
                x.OutrasSituacoes)).ToList();

            await bus.PubSub.PublishAsync(messageQueue, cancellationToken);
            return ImportMatriculasResult.Accepted;
        }
    }
}
