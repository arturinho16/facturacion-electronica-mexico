# Ejemplo CFDI con concepto normal y combustible

Este ejemplo muestra el comportamiento esperado:

- El concepto normal no lleva `cfdi:ComplementoConcepto`.
- El concepto con `ClaveProdServ="15101514"` lleva el complemento `HidroYPetro`.

```xml
<cfdi:Comprobante
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:hidrocarburospetroliferos="http://www.sat.gob.mx/hidrocarburospetroliferos"
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/hidrocarburospetroliferos http://www.sat.gob.mx/sitio_internet/cfd/hidrocarburospetroliferos/hidrocarburospetroliferos.xsd"
  Version="4.0"
  TipoDeComprobante="I">
  <cfdi:Conceptos>
    <cfdi:Concepto
      ClaveProdServ="81111500"
      Cantidad="1"
      ClaveUnidad="E48"
      Unidad="Unidad de servicio"
      Descripcion="Desarrollo web"
      ValorUnitario="5000.000000"
      Importe="5000.00"
      ObjetoImp="02" />

    <cfdi:Concepto
      ClaveProdServ="15101514"
      Cantidad="40"
      ClaveUnidad="LTR"
      Unidad="Litro"
      Descripcion="Gasolina regular menor a 91 octanos"
      ValorUnitario="21.500000"
      Importe="860.00"
      ObjetoImp="02">
      <cfdi:ComplementoConcepto>
        <hidrocarburospetroliferos:HidroYPetro
          Version="1.0"
          TipoPermiso="PER07"
          NumeroPermiso="PL/0000/EXP/ES/2026"
          ClaveHYP="15101514"
          SubProductoHYP="SPXX" />
      </cfdi:ComplementoConcepto>
    </cfdi:Concepto>
  </cfdi:Conceptos>
</cfdi:Comprobante>
```

`SubProductoHYP` debe capturarse con la clave vigente del catálogo SAT aplicable al combustible vendido.
