using DAC4GIL.Application.Features.Matriculas.DTOs;
using MediatR;

namespace DAC4GIL.Application.Features.Matriculas.Queries;

public record GetMatriculaMetricsQuery() : IRequest<List<MatriculaDto>>;
