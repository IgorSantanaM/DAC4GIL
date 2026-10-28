namespace DAC4GIL.Application.Features.Matriculas.DTOs
{
    public record MatriculaDto(int AnoReferencia,
            string NomeMunicipio,
            string NomeUnidadeEscolar,
            int MatriculasTotal,
            int MatriculaInicial,
            int MatriculaAposCenso,
            int Transferidos,
            int Cancelados,
            int Falecido,
            int Abandono,
            int Aprovados,
            int Reprovados,
            int Cursando,
            int OutrasSituacoes);
}