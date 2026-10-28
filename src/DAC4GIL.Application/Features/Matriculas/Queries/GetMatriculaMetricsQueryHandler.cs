using DAC4GIL.Application.Features.Matriculas.DTOs;
using DAC4GIL.Domain.Matriculas;
using MediatR;
using System;
using System.Collections.Generic;
using System.Text;

namespace DAC4GIL.Application.Features.Matriculas.Queries
{
    public class GetMatriculaMetricsQueryHandler(IMatriculaRepository repository) 
        : IRequestHandler<GetMatriculaMetricsQuery, List<MatriculaDto>>
    {
        public async Task<List<MatriculaDto>> Handle(GetMatriculaMetricsQuery request, CancellationToken cancellationToken)
        {
            var matriculas = await repository.GetAllAsync(cancellationToken);

            var matriculasDto = matriculas.Select(x => new MatriculaDto(x.AnoReferencia,
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

            return matriculasDto;
        }
    }
}
