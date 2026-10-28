using DAC4GIL.Domain.Core.Model;

namespace DAC4GIL.Domain.Matriculas
{
    public class Matricula : Entity<int>, IAggregateRoot
    {
        public int AnoReferencia { get; private set; }
        public string NomeMunicipio { get; private set; } = string.Empty;
        public string NomeUnidadeEscolar { get; private set; } = string.Empty;
        public int MatriculasTotal { get; private set; }
        public int MatriculaInicial { get; private set; }
        public int MatriculaAposCenso { get; private set; }
        public int Transferidos { get; private set; }
        public int Cancelados { get; private set; }
        public int Falecido { get; private set; }
        public int Abandono { get; private set; }
        public int Aprovados { get; private set; }
        public int Reprovados { get; private set; }
        public int Cursando { get; private set; }
        public int OutrasSituacoes { get; private set; }

        public Matricula(int anoReferencia,
            string nomeMunicipio,
            string nomeUnidadeEscolar,
            int matriculasTotal,
            int matriculaInicial,
            int matriculaAposCenso,
            int transferidos,
            int cancelados,
            int falecido,
            int abandono,
            int aprovados,
            int reprovados,
            int cursando,
            int outrasSituacoes)
        {
            if (anoReferencia < 2018)
                throw new DomainException("O Ano de referência deve ser maior ou igual a 2018");

            if (string.IsNullOrEmpty(nomeMunicipio))
                throw new DomainException("O Nome do Municipio não pode ser nulo");

            if (string.IsNullOrEmpty(nomeUnidadeEscolar))
                throw new DomainException("O Nome da unidade escolar não pode ser nulo");

            if (matriculasTotal < 0)
                throw new DomainException("O total de matriculas não pode ser negativa");

            if (matriculaInicial < 0)
                throw new DomainException("O total de matriculas iniciais não pode ser negativa");

            if (matriculaAposCenso < 0)
                throw new DomainException("O total de matriculas apos censo não pode ser negativa");

            if (transferidos < 0)
                throw new DomainException("O total de transferidos não pode ser negativa");

            if (cancelados < 0)
                throw new DomainException("O total de matriculas canceladas não pode ser negativa");

            if (falecido < 0)
                throw new DomainException("O total de falecidos não pode ser negativa");

            if (abandono < 0)
                throw new DomainException("O total de abandonos não pode ser negativa");

            if (aprovados < 0)
                throw new DomainException("O total de aprovados não pode ser negativa");

            if (reprovados < 0)
                throw new DomainException("O total de reprovados não pode ser negativa");

            if (cursando < 0)
                throw new DomainException("O total de cursando não pode ser negativa");

            if (outrasSituacoes < 0)
                throw new DomainException("O total de outras situações não pode ser negativa");
        }
    }
}
