FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["src/GharMitra.Api/GharMitra.Api.csproj", "src/GharMitra.Api/"]
COPY ["src/GharMitra.Application/GharMitra.Application.csproj", "src/GharMitra.Application/"]
COPY ["src/GharMitra.Domain/GharMitra.Domain.csproj", "src/GharMitra.Domain/"]
COPY ["src/GharMitra.Infrastructure/GharMitra.Infrastructure.csproj", "src/GharMitra.Infrastructure/"]

RUN dotnet restore "src/GharMitra.Api/GharMitra.Api.csproj"

COPY src/ src/
WORKDIR "/src/src/GharMitra.Api"
RUN dotnet publish "GharMitra.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 5080
ENV ASPNETCORE_URLS=http://+:5080
ENV ASPNETCORE_ENVIRONMENT=Development
ENTRYPOINT ["dotnet", "GharMitra.Api.dll"]