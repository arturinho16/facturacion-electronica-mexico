export interface DatosEmisor {
    rfc: string;
    nombre: string;
    regimenFiscal: string;     // 601
    lugarExpedicion: string;   // CP
    registroPatronal?: string; // B7032191100
    rfcPatronOrigen?: string;
    entidadSncf?: {
        origenRecurso: "IP" | "IF" | "IM";
        montoRecursoPropio?: number;
    };
}

export interface EmpleadoNomina {
    curp: string;
    nss?: string;
    fechaInicioRelLaboral?: string; // yyyy-MM-dd ≤ FechaPago
    antiguedad?: string;             // PnW (ISO 8601 duración en semanas)
    tipoContrato: string;            // 01..99
    sindicalizado?: "Sí" | "No";
    tipoJornada?: string;            // 01..99
    tipoRegimen: string;             // 02 asalariado
    numEmpleado: string;
    departamento?: string;
    puesto?: string;
    riesgoPuesto?: string;           // 1..5
    periodicidadPago: string;        // 04 quincenal
    banco?: string;                  // c_Banco
    cuentaBancaria?: string;
    salarioBaseCotApor?: number;
    salarioDiarioIntegrado?: number;
    claveEntFed: string;             // HID, CMX, etc.
}

export interface PeriodoNomina {
    tipoNomina: "O" | "E";
    fechaPago: string;       // yyyy-MM-dd
    fechaInicial: string;
    fechaFinal: string;
    numDiasPagados: number;
}
