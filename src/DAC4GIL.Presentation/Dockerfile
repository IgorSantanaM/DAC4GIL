FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /source
COPY ["src/DAC4GIL.Application/DAC4GIL.Application.csproj", "src/DAC4GIL.Application/"]
COPY ["src/DAC4GIL.Domain/DAC4GIL.Domain.csproj", "src/DAC4GIL.Domain/"]
COPY ["src/DAC4GIL.Domain.Core/DAC4GIL.Domain.Core.csproj", "src/DAC4GIL.Domain.Core/"]
COPY ["src/DAC4GIL.Infra.CrossCutting/DAC4GIL.Infra.CrossCutting.csproj", "src/DAC4GIL.Infra.CrossCutting/"]
COPY ["src/DAC4GIL.Infra.Data/DAC4GIL.Infra.Data.csproj", "src/DAC4GIL.Infra.Data/"]
COPY ["src/DAC4GIL.Messaging/DAC4GIL.Messaging.csproj", "src/DAC4GIL.Messaging/"]
COPY ["src/DAC4GIL.Presentation/DAC4GIL.Presentation.csproj", "src/DAC4GIL.Presentation/"]
RUN dotnet restore "src/DAC4GIL.Presentation/DAC4GIL.Presentation.csproj"
COPY src/ src/
RUN dotnet publish "src/DAC4GIL.Presentation/DAC4GIL.Presentation.csproj" -c Release --no-restore -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "DAC4GIL.Presentation.dll"]
