using DAC4GIL.Domain.Matriculas;
using DAC4GIL.Infra.Data.Extensions;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore;

namespace DAC4GIL.Infra.Data.Mappings
{
    public class MatriculaMapping : EntityTypeConfiguration<Matricula>
    {
        public override void Configure(EntityTypeBuilder<Matricula> builder)
        {
            builder.ToTable("Matriculas");

            builder.HasKey(m => m.Id);

            builder.Property(m => m.AnoReferencia)
                .IsRequired();

            builder.Property(m => m.NomeMunicipio)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(m => m.NomeUnidadeEscolar)
            .IsRequired()
            .HasMaxLength(100);

            builder.Property(m => m.MatriculasTotal)
            .IsRequired();

            builder.Property(m => m.MatriculaInicial)
            .IsRequired();

            builder.Property(m => m.MatriculaAposCenso)
            .IsRequired();

            builder.Property(m => m.Transferidos)
            .IsRequired();

            builder.Property(m => m.Cancelados)
            .IsRequired();

            builder.Property(m => m.Falecido)
            .IsRequired();

            builder.Property(m => m.Abandono)
            .IsRequired();

            builder.Property(m => m.Aprovados)
            .IsRequired();

            builder.Property(m => m.Reprovados)
            .IsRequired();
            builder.Property(m => m.Cursando)
            .IsRequired();

            builder.Property(m => m.OutrasSituacoes)
            .IsRequired();
        }
    }
}
