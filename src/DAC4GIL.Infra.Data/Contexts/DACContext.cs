using DAC4GIL.Domain.Matriculas;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;

namespace DAC4GIL.Infra.Data.Contexts
{
    public class DACContext(DbContextOptions<DACContext> options) : DbContext(options)
    {
        public DbSet<Matricula> Matriculas { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(DACContext).Assembly);

            base.OnModelCreating(modelBuilder);
        }
    }
}
