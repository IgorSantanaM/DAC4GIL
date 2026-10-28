using DAC4GIL.Messaging.DTOs;
using EasyNetQ;
using MediatR;

namespace DAC4GIL.Application.Features.Matriculas.Commands
{
    public class CreateMatriculaCommandHandler(IBus bus) : IRequestHandler<CreateMatriculaCommand>
    {
        public async Task Handle(CreateMatriculaCommand request, CancellationToken cancellationToken)
        {
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
        }
    }
}
