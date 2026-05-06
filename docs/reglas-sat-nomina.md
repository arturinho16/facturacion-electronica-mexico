# Reglas SAT Nómina 1.2 Aplicadas

Fuente local: `validacion-xml/Guia_llenado_Nomina.pdf`.

## CFDI 4.0 de nómina

- `FormaPago`, `CondicionesDePago` y `TipoCambio` no deben existir.
- `Moneda` debe ser `MXN`.
- `TipoDeComprobante` debe ser `N`.
- `Exportacion` debe ser `01`.
- `MetodoPago` debe ser `PUE`.
- `LugarExpedicion` debe ser un código postal de 5 dígitos.
- `InformacionGlobal` no debe existir.
- `UsoCFDI` debe ser `CN01`.
- `RegimenFiscalReceptor` debe ser `605`.
- `ResidenciaFiscal` y `NumRegIdTrib` no deben existir en receptor de nómina.
- El CFDI debe tener exactamente un concepto.
- El concepto debe usar `ClaveProdServ=84111505`, `Cantidad=1`, `ClaveUnidad=ACT`, `Descripcion=Pago de nómina` y `ObjetoImp=01`.
- `NoIdentificacion`, `Unidad` e impuestos del concepto no deben existir.
- `ValorUnitario` e `Importe` del concepto deben coincidir con `TotalPercepciones + TotalOtrosPagos`.
- `Descuento` del concepto debe coincidir con `TotalDeducciones`; si no hay deducciones, debe omitirse.

## Complemento Nómina

- `Version` de nómina debe ser `1.2`.
- `TipoNomina` debe ser `O` u `E`.
- Si `TipoNomina=O`, `PeriodicidadPago` debe ser `01` a `10`; no debe ser `99`.
- Si `TipoNomina=E`, `PeriodicidadPago` debe ser `99`.
- `FechaInicialPago` no puede ser posterior a `FechaFinalPago`.
- `FechaFinalPago` no puede ser posterior a `FechaPago`.
- `NumDiasPagados` debe ser mayor a cero, máximo `36160`, y tener hasta 3 decimales.
- `TotalPercepciones` debe coincidir con `TotalSueldos + TotalSeparacionIndemnizacion + TotalJubilacionPensionRetiro`.
- `TotalPercepciones` debe coincidir con `TotalGravado + TotalExento`.
- `TotalDeducciones` debe coincidir con `TotalOtrasDeducciones + TotalImpuestosRetenidos`.
- Si no hay deducciones, no debe existir nodo `Deducciones`.
- Si hay deducciones, debe existir nodo `Deducciones`.

## Registro Patronal y Relación Laboral

- `RegistroPatronal` debe existir cuando `TipoContrato` sea `01` a `08`.
- Si `TipoContrato` es `01` a `08`, `TipoRegimen` debe ser `02`, `03` o `04`.
- Si `TipoContrato` es `09` o superior, `TipoRegimen` debe estar entre `05` y `99`.
- `RegistroPatronal` debe tener de 1 a 20 caracteres.
- Si existe `RegistroPatronal`, deben existir `NumSeguridadSocial`, `FechaInicioRelLaboral`, `Antigüedad`, `RiesgoPuesto`, `SalarioBaseCotApor` y `SalarioDiarioIntegrado`.
- Si no existe `RegistroPatronal`, no deben existir esos campos laborales/IMSS.
- `NumEmpleado` debe tener de 1 a 15 caracteres.
- `ClaveEntFed` debe pertenecer al catálogo de entidades SAT.

## Banco y Cuenta Bancaria

- `CuentaBancaria` debe tener 10, 11, 15, 16 o 18 dígitos.
- Si `CuentaBancaria` tiene 18 dígitos, se considera CLABE y no debe existir `Banco`.
- Si `CuentaBancaria` tiene 10, 11 o 16 dígitos, debe existir `Banco`.

## Percepciones

- La suma de percepciones debe coincidir con `TotalPercepciones`.
- `TotalSueldos` debe sumar percepciones distintas de `022`, `023`, `025`, `039` y `044`.
- `TotalSeparacionIndemnizacion` debe sumar percepciones `022`, `023` y `025`.
- `TotalJubilacionPensionRetiro` debe sumar percepciones `039` y `044`.
- `TotalGravado` y `TotalExento` deben coincidir con la suma de sus importes.
- Cada `Clave` de percepción debe tener de 3 a 15 caracteres.
- Cada percepción debe tener importe total mayor a cero.
- La percepción `038` debe llevar `ImporteExento=0.00`.
- Percepciones `022`, `023` y `025` requieren nodo `SeparacionIndemnizacion`.
- Percepciones `039` y `044` requieren nodo `JubilacionPensionRetiro`.
- Percepción `039` requiere `TotalUnaExhibicion` y no debe combinarse con `TotalParcialidad` ni `MontoDiario`.
- Percepción `044` requiere `TotalParcialidad` y `MontoDiario`, y no debe incluir `TotalUnaExhibicion`.
- Percepción `045` requiere nodo `AccionesOTitulos`.
- Percepción `019` requiere nodo `HorasExtra`.
- Percepción `014` requiere nodo `Incapacidades`.

## Deducciones

- La suma de deducciones debe coincidir con `TotalDeducciones`.
- `TotalImpuestosRetenidos` debe sumar deducciones tipo `002`.
- `TotalOtrasDeducciones` debe sumar deducciones distintas de `002`.
- Cada `Clave` de deducción debe tener de 3 a 15 caracteres.
- Cada deducción debe tener importe mayor a cero.
- Deducción `006` requiere nodo `Incapacidades`.

## Otros Pagos e Incapacidades

- La suma de otros pagos debe coincidir con `TotalOtrosPagos`.
- Cada `Clave` de otro pago debe tener de 3 a 15 caracteres.
- Cada otro pago debe tener importe mayor a cero.
- Otro pago `002` requiere nodo `SubsidioAlEmpleo`, y `SubsidioCausado` debe ser mayor o igual al importe del otro pago.
- Otro pago `004` requiere nodo `CompensacionSaldosAFavor`.
- Cada incapacidad debe tener `DiasIncapacidad` entero mayor a cero y `TipoIncapacidad`.
- `ImporteMonetario` de incapacidad no puede ser negativo.
