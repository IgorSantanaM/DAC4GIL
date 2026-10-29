using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace DAC4GIL.Infra.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Matriculas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AnoReferencia = table.Column<int>(type: "integer", nullable: false),
                    NomeMunicipio = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    NomeUnidadeEscolar = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    MatriculasTotal = table.Column<int>(type: "integer", nullable: false),
                    MatriculaInicial = table.Column<int>(type: "integer", nullable: false),
                    MatriculaAposCenso = table.Column<int>(type: "integer", nullable: false),
                    Transferidos = table.Column<int>(type: "integer", nullable: false),
                    Cancelados = table.Column<int>(type: "integer", nullable: false),
                    Falecido = table.Column<int>(type: "integer", nullable: false),
                    Abandono = table.Column<int>(type: "integer", nullable: false),
                    Aprovados = table.Column<int>(type: "integer", nullable: false),
                    Reprovados = table.Column<int>(type: "integer", nullable: false),
                    Cursando = table.Column<int>(type: "integer", nullable: false),
                    OutrasSituacoes = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Matriculas", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Matriculas");
        }
    }
}
