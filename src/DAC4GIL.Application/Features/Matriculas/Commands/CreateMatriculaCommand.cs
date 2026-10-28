using DAC4GIL.Application.Features.Matriculas.DTOs;
using MediatR;

namespace DAC4GIL.Application.Features.Matriculas.Commands
{
    public record CreateMatriculaCommand(ICollection<MatriculaDto> Matriculas) : IRequest;
}
