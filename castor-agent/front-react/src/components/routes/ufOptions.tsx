/**
 * Lista de UFs na mesma ordem do legado. Renderizada sem `value`, como no HTML
 * original — o valor da option passa a ser o proprio texto.
 */
export const UF_LIST = [
  "SP",
  "RJ",
  "MG",
  "PR",
  "SC",
  "RS",
  "BA",
  "GO",
  "DF",
  "ES",
  "MS",
  "MT",
  "PE",
  "CE",
  "PA",
  "MA",
  "PB",
  "RN",
  "AL",
  "SE",
  "AM",
  "PI",
  "AC",
  "RO",
  "RR",
  "AP",
  "TO",
] as const;

export const UfOptions = () => (
  <>
    {UF_LIST.map((uf) => (
      <option key={uf}>{uf}</option>
    ))}
  </>
);
