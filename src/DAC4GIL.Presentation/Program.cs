using DAC4GIL.Application.Features.Matriculas.Commands;
using DAC4GIL.Presentation.OpenApi;
using DAC4GIL.Infra.CrossCutting;
using DAC4GIL.Presentation.Endpoints.Internal;
using DAC4GIL.Infra.Data.Contexts;
using Microsoft.EntityFrameworkCore;

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

using var scope = app.Services.CreateScope();

var dbContext = scope.ServiceProvider.GetRequiredService<DACContext>();
dbContext.Database.Migrate();

app.UseEndpoints<Program>();

app.Run();
