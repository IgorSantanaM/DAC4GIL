using DAC4GIL.Application.Features.Matriculas.Commands;
using DAC4GIL.Presentation.OpenApi;
using DAC4GIL.Infra.CrossCutting;
using DAC4GIL.Presentation.Endpoints.Internal;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddMediatR(options
    => options.RegisterServicesFromAssemblyContaining<CreateMatriculaCommand>());

builder.Services.AddOpenApi(options
    => options.AddOperationTransformer<ImportOperationTransformer>());

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("../openapi/v1.json", "DAC4GIL API v1");
        options.DocumentTitle = "DAC4GIL - Swagger";
    });
}

app.UseEndpoints<Program>();

app.Run();
