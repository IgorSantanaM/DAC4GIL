using System.Text.Json;
using DAC4GIL.Application.Features.Matriculas.DTOs;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace DAC4GIL.Presentation.OpenApi;

public sealed class ImportOperationTransformer : IOpenApiOperationTransformer
{
    public Task TransformAsync(OpenApiOperation operation, OpenApiOperationTransformerContext context, CancellationToken cancellationToken)
    {
        var path = context.Description.RelativePath;
        if (path is not ("api/matriculas/import-csv" or "api/matriculas/import-json"))
            return Task.CompletedTask;

        var csv = path.EndsWith("import-csv", StringComparison.Ordinal);
        operation.Summary = csv ? "Importar matrículas de arquivo CSV" : "Importar matrículas de JSON";
        operation.Description = "Valida os dados e envia para processamento assíncrono via RabbitMQ. " +
            (csv ? "Use o campo file. CSV aceita vírgula ou ponto e vírgula; consulte os cabeçalhos no README." : "Envie um array JSON no corpo ou um arquivo JSON no campo file.");
        operation.RequestBody = new OpenApiRequestBody
        {
            Required = true,
            Content = new Dictionary<string, OpenApiMediaType>
            {
                ["multipart/form-data"] = new()
                {
                    Schema = new OpenApiSchema
                    {
                        Type = JsonSchemaType.Object,
                        Required = new HashSet<string> { "file" },
                        Properties = new Dictionary<string, IOpenApiSchema>
                        {
                            ["file"] = new OpenApiSchema { Type = JsonSchemaType.String, Format = "binary" }
                        }
                    }
                }
            }
        };
        if (!csv)
        {
            operation.RequestBody.Content!["application/json"] = new OpenApiMediaType
            {
                Schema = new OpenApiSchema
                {
                    Type = JsonSchemaType.Array,
                    Items = new OpenApiSchema
                    {
                        Type = JsonSchemaType.Object,
                        Properties = typeof(MatriculaDto).GetProperties().ToDictionary(
                            p => JsonNamingPolicy.CamelCase.ConvertName(p.Name),
                            p => (IOpenApiSchema)new OpenApiSchema { Type = p.PropertyType == typeof(int) ? JsonSchemaType.Integer : JsonSchemaType.String })
                    }
                }
            };
        }
        operation.Responses ??= new OpenApiResponses();
        operation.Responses.Remove("200");
        operation.Responses["202"] = new OpenApiResponse { Description = "Importação enviada para processamento." };
        operation.Responses["400"] = new OpenApiResponse { Description = "Arquivo ausente, formato inválido ou dados inválidos." };
        return Task.CompletedTask;
    }
}
