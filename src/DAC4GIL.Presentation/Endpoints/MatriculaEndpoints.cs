using System.Globalization;
using System.Text.Json;
using DAC4GIL.Application.Features.Matriculas.Commands;
using DAC4GIL.Application.Features.Matriculas.DTOs;
using DAC4GIL.Application.Features.Matriculas.Queries;
using DAC4GIL.Domain.Core.Exceptions;
using DAC4GIL.Domain.Matriculas;
using DAC4GIL.Presentation.Endpoints.Internal;
using MediatR;
using Microsoft.VisualBasic.FileIO;

namespace DAC4GIL.Presentation.Endpoints;

public class MatriculaEndpoints : IEndpoints
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly string[] Columns = typeof(MatriculaDto).GetProperties().Select(p => p.Name).ToArray();

    public static void DefineEndpoints(WebApplication app)
    {
        var group = app.MapGroup("/api/matriculas")
            .WithTags("Matriculas");

        group.MapPost("/import-csv",
            (HttpRequest request, IMediator mediator, CancellationToken ct)
                => ImportAsync(request, mediator, true, ct));
        group.MapPost("/import-json",
            (HttpRequest request, IMediator mediator, CancellationToken ct)
            => ImportAsync(request, mediator, false, ct));
        group.MapGet("/get-metrics", async (IMediator mediator, CancellationToken ct) =>
            Results.Ok(await mediator.Send(new GetMatriculaMetricsQuery(), ct)));
    }

    private static async Task<IResult> ImportAsync(HttpRequest request, IMediator mediator, bool csv, CancellationToken ct)
    {
        try
        {
            List<MatriculaDto>? data;
            if (!csv && request.HasJsonContentType())
                data = await JsonSerializer.DeserializeAsync<List<MatriculaDto>>(request.Body, JsonOptions, ct);
            else
            {
                if (!request.HasFormContentType)
                    return Results.BadRequest("Envie multipart/form-data com o arquivo no campo file, ou application/json para importar JSON.");
                var form = await request.ReadFormAsync(ct);
                var file = form.Files.GetFile("file");
                if (file is null || file.Length == 0) return Results.BadRequest("Envie um arquivo não vazio no campo file.");
                await using var stream = file.OpenReadStream();
                if (csv) data = ReadCsv(stream);
                else data = await JsonSerializer.DeserializeAsync<List<MatriculaDto>>(stream, JsonOptions, ct);
            }
            if (data is null || data.Count == 0) return Results.BadRequest("Nenhuma matrícula informada.");
            foreach (var item in data)
            {
                if (item is null) return Results.BadRequest("A lista contém uma matrícula nula.");
                if (item.NomeMunicipio?.Length > 100 || item.NomeUnidadeEscolar?.Length > 100)
                    return Results.BadRequest("Município e unidade escolar devem ter até 100 caracteres.");
                _ = new Matricula(item.AnoReferencia, item.NomeMunicipio!, item.NomeUnidadeEscolar!,
                    item.MatriculasTotal, item.MatriculaInicial, item.MatriculaAposCenso, item.Transferidos,
                    item.Cancelados, item.Falecido, item.Abandono, item.Aprovados, item.Reprovados, item.Cursando, item.OutrasSituacoes);
            }
            await mediator.Send(new CreateMatriculaCommand(data), ct);
            return Results.Accepted(value: new { mensagem = "Importação enviada para processamento.", quantidade = data.Count });
        }
        catch (Exception ex) when (ex is JsonException or FormatException or OverflowException or MalformedLineException or DomainExceptions)
        {
            return Results.BadRequest(new { erro = ex.Message });
        }
    }

    private static List<MatriculaDto> ReadCsv(Stream stream)
    {
        using var reader = new StreamReader(stream);
        var header = reader.ReadLine() ?? throw new FormatException("CSV sem cabeçalho.");
        var delimiter = header.Contains(';') ? ";" : ",";
        using var parser = new TextFieldParser(new StringReader(header + "\n" + reader.ReadToEnd()));
        parser.SetDelimiters(delimiter);
        parser.HasFieldsEnclosedInQuotes = true;
        var headers = parser.ReadFields()!;
        var indices = Columns.Select(column => Array.FindIndex(headers, h => string.Equals(h.Trim(), column, StringComparison.OrdinalIgnoreCase))).ToArray();
        if (indices.Any(i => i < 0)) throw new FormatException("Cabeçalho esperado: " + string.Join(delimiter, Columns));
        var result = new List<MatriculaDto>();
        while (!parser.EndOfData)
        {
            var fields = parser.ReadFields()!;
            if (fields.Length != headers.Length) throw new FormatException("Quantidade de colunas inválida no CSV.");
            // Usa o mesmo contrato e conversão de tipos da importação JSON.
            var row = new Dictionary<string, object>();
            for (var i = 0; i < Columns.Length; i++)
            {
                var value = fields[indices[i]];
                row[Columns[i]] = i is 1 or 2 ? value : int.Parse(value, CultureInfo.InvariantCulture);
            }
            result.Add(JsonSerializer.Deserialize<MatriculaDto>(JsonSerializer.Serialize(row), JsonOptions)!);
        }
        return result;
    }
}
