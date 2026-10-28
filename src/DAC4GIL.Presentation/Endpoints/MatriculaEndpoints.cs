using DAC4GIL.Application.Features.Matriculas.Commands;
using DAC4GIL.Presentation.Endpoints.Internal;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace DAC4GIL.Presentation.Endpoints
{
    public class MatriculaEndpoints : IEndpoints
    {
        public static void DefineEndpoints(WebApplication app)
        {
            var group = app.MapGroup("/api/matriculas")
                .WithName("Matriculas");


            group.MapPost("/import-csv", ImportCsvHandlerAsync);
            group.MapPost("/import-json", ImportJsonHandlerAsync);
            group.MapGet("/get-metrics", GetMetricsHandlerAsync);
        }

        #region Handlers
        private static async Task<IResult> ImportCsvHandlerAsync(HttpRequest request,[FromServices] IMediator mediator, CancellationToken cancellationToken)
        {
            var formFile = request.Form.Files.GetFile("file");
            if (formFile == null || formFile.Length == 0)
                return Results.BadRequest("No file uploaded.");
            using var stream = formFile.OpenReadStream();
            using var reader = new StreamReader(stream);
            var csvContent = await reader.ReadToEndAsync(cancellationToken);
            var command = new CreateMatriculaCommand(csvContent);
            await mediator.Send(command, cancellationToken);
            return Results.Ok("CSV data imported successfully.");
        }

        private static async Task<IResult> ImportJsonHandlerAsync(HttpRequest request, [FromServices] IMediator mediator, CancellationToken cancellationToken)
        {
            var formFile = request.Form.Files.GetFile("file");
            if (formFile == null || formFile.Length == 0)
                return Results.BadRequest("No file uploaded.");
            using var stream = formFile.OpenReadStream();
            using var reader = new StreamReader(stream);
            var jsonContent = await reader.ReadToEndAsync(cancellationToken);
            var command = new CreateMatriculaCommand(jsonContent);
            await mediator.Send(command, cancellationToken);
            return Results.Ok("JSON data imported successfully.");
        }

        private static async Task<IResult> GetMetricsHandlerAsync([FromServices] IMediator mediator, CancellationToken cancellationToken)
        {
            var command = new GetMatriculaMetricsQuery();
            var metrics = await mediator.Send(command, cancellationToken);
            return Results.Ok(metrics);
        }

        #endregion
    }
}
