# Graph Report - .  (2026-05-11)

## Corpus Check
- 172 files · ~242,369 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1442 nodes · 2380 edges · 86 communities (76 shown, 10 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 211 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Quotation and API Route Handlers|Quotation and API Route Handlers]]
- [[_COMMUNITY_SAT Received Invoice Downloads|SAT Received Invoice Downloads]]
- [[_COMMUNITY_SAT Catalogs and Dashboard State|SAT Catalogs and Dashboard State]]
- [[_COMMUNITY_Fiscal Configuration and Certificates|Fiscal Configuration and Certificates]]
- [[_COMMUNITY_System Settings and Backup UI|System Settings and Backup UI]]
- [[_COMMUNITY_Labor and Tax Calculators|Labor and Tax Calculators]]
- [[_COMMUNITY_Core CFDI and CRUD APIs|Core CFDI and CRUD APIs]]
- [[_COMMUNITY_Quote Creation Form|Quote Creation Form]]
- [[_COMMUNITY_Outgoing Invoice UI and Catalogs|Outgoing Invoice UI and Catalogs]]
- [[_COMMUNITY_Invoice PDF and Email Workflow|Invoice PDF and Email Workflow]]
- [[_COMMUNITY_Quote Folio and Editing Workflow|Quote Folio and Editing Workflow]]
- [[_COMMUNITY_Payroll Batch UI|Payroll Batch UI]]
- [[_COMMUNITY_SAT Download and Certificate Concepts|SAT Download and Certificate Concepts]]
- [[_COMMUNITY_Calculator UI and Client APIs|Calculator UI and Client APIs]]
- [[_COMMUNITY_Invoice Stamping and Email Domain|Invoice Stamping and Email Domain]]
- [[_COMMUNITY_Authentication and Dashboard Navigation|Authentication and Dashboard Navigation]]
- [[_COMMUNITY_Client Catalog UI|Client Catalog UI]]
- [[_COMMUNITY_Product Catalog UI|Product Catalog UI]]
- [[_COMMUNITY_Dashboard Metrics UI|Dashboard Metrics UI]]
- [[_COMMUNITY_Payroll Validation Rules|Payroll Validation Rules]]
- [[_COMMUNITY_Backup Execution and Cloud Uploads|Backup Execution and Cloud Uploads]]
- [[_COMMUNITY_Backup Scheduler|Backup Scheduler]]
- [[_COMMUNITY_Employee Nomina Catalog APIs|Employee Nomina Catalog APIs]]
- [[_COMMUNITY_OneDrive and OAuth Helpers|OneDrive and OAuth Helpers]]
- [[_COMMUNITY_Admin Users and Module Permissions|Admin Users and Module Permissions]]
- [[_COMMUNITY_Miscellaneous API Utilities|Miscellaneous API Utilities]]
- [[_COMMUNITY_Invoice Consolidation Export UI|Invoice Consolidation Export UI]]
- [[_COMMUNITY_Employee List UI|Employee List UI]]
- [[_COMMUNITY_System Backup Archive Model|System Backup Archive Model]]
- [[_COMMUNITY_Google Drive Backup Helpers|Google Drive Backup Helpers]]
- [[_COMMUNITY_Payroll Calculation Engine|Payroll Calculation Engine]]
- [[_COMMUNITY_Backup History and Access APIs|Backup History and Access APIs]]
- [[_COMMUNITY_Generic Form Error Handling|Generic Form Error Handling]]
- [[_COMMUNITY_Tax Constants and Setup Concepts|Tax Constants and Setup Concepts]]
- [[_COMMUNITY_Quote List UI|Quote List UI]]
- [[_COMMUNITY_Nomina CFDI Stamping Engine|Nomina CFDI Stamping Engine]]
- [[_COMMUNITY_Catalog and Quote UI Workflows|Catalog and Quote UI Workflows]]
- [[_COMMUNITY_Global Invoice Process UI|Global Invoice Process UI]]
- [[_COMMUNITY_Database Restore Commands|Database Restore Commands]]
- [[_COMMUNITY_Global Invoice Period UI|Global Invoice Period UI]]
- [[_COMMUNITY_Session Token and Role Model|Session Token and Role Model]]
- [[_COMMUNITY_JWT Verification Helpers|JWT Verification Helpers]]
- [[_COMMUNITY_Backup API Concepts|Backup API Concepts]]
- [[_COMMUNITY_Cloud Backup OAuth APIs|Cloud Backup OAuth APIs]]
- [[_COMMUNITY_Login Page State|Login Page State]]
- [[_COMMUNITY_Factura PDF Component|Factura PDF Component]]
- [[_COMMUNITY_SFTP Backup Client|SFTP Backup Client]]
- [[_COMMUNITY_Authenticated Admin Resolution|Authenticated Admin Resolution]]
- [[_COMMUNITY_Seed and Restore Utilities|Seed and Restore Utilities]]
- [[_COMMUNITY_Bulk Invoice Download UI|Bulk Invoice Download UI]]
- [[_COMMUNITY_Backup Runtime Utilities|Backup Runtime Utilities]]
- [[_COMMUNITY_Admin Configuration Concepts|Admin Configuration Concepts]]
- [[_COMMUNITY_Folio Sequencing API|Folio Sequencing API]]
- [[_COMMUNITY_Invoice Detail Actions UI|Invoice Detail Actions UI]]
- [[_COMMUNITY_Dashboard and Metadata Concepts|Dashboard and Metadata Concepts]]
- [[_COMMUNITY_Consolidated XLSX Export|Consolidated XLSX Export]]
- [[_COMMUNITY_Backup Settings Actions|Backup Settings Actions]]
- [[_COMMUNITY_Appearance Settings Actions|Appearance Settings Actions]]
- [[_COMMUNITY_Button Component|Button Component]]
- [[_COMMUNITY_Restore API Concepts|Restore API Concepts]]
- [[_COMMUNITY_SAT Nomina Rule Concepts|SAT Nomina Rule Concepts]]
- [[_COMMUNITY_XML Parsing Helpers|XML Parsing Helpers]]
- [[_COMMUNITY_Card Component|Card Component]]
- [[_COMMUNITY_Status Badge Component|Status Badge Component]]
- [[_COMMUNITY_Login and Session Concepts|Login and Session Concepts]]
- [[_COMMUNITY_SFTP Type Declarations|SFTP Type Declarations]]
- [[_COMMUNITY_Root Layout Metadata|Root Layout Metadata]]
- [[_COMMUNITY_XML Upload and Sync UI|XML Upload and Sync UI]]
- [[_COMMUNITY_Invoice Stamp and Cancel UI|Invoice Stamp and Cancel UI]]
- [[_COMMUNITY_Folio Sequence Concepts|Folio Sequence Concepts]]
- [[_COMMUNITY_Next.js Configuration|Next.js Configuration]]
- [[_COMMUNITY_ESLint Configuration|ESLint Configuration]]
- [[_COMMUNITY_Download Verification UI|Download Verification UI]]
- [[_COMMUNITY_Money Formatting Helpers|Money Formatting Helpers]]
- [[_COMMUNITY_SVG UI Assets|SVG UI Assets]]
- [[_COMMUNITY_ESLint Core Web Vitals Config|ESLint Core Web Vitals Config]]

## God Nodes (most connected - your core abstractions)
1. `String()` - 61 edges
2. `requireModule()` - 47 edges
3. `getActiveConfig()` - 30 edges
4. `runBackup()` - 23 edges
5. `GET()` - 21 edges
6. `POST()` - 18 edges
7. `requireAdmin()` - 17 edges
8. `normalizarPerfilClave()` - 16 edges
9. `POST()` - 15 edges
10. `generarXMLNomina()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `SAT Catalog Batch Update Instructions` --semantically_similar_to--> `Common SAT Unit Catalog Seed`  [INFERRED] [semantically similar]
  updateclaves-satproduyunidadmedia.txt → semilla-sat.sql
- `SAT Catalog Batch Update Instructions` --semantically_similar_to--> `SAT Product Service Catalog Seed`  [INFERRED] [semantically similar]
  updateclaves-satproduyunidadmedia.txt → semilla-sat.sql
- `Payroll Receptor Regimen 605` --semantically_similar_to--> `Applied SAT Nomina Rules`  [INFERRED] [semantically similar]
  Wiki-nomina/guia de llenado.pdf → docs/reglas-sat-nomina.md
- `Globe SVG Icon` --conceptually_related_to--> `Dashboard Module Navigation`  [AMBIGUOUS]
  public/globe.svg → src/app/page.tsx
- `Corrected Aguinaldo Result UI` --conceptually_related_to--> `Percepciones Structure`  [INFERRED]
  calculadoras/correcion-aguinaldo.png → Wiki-nomina/estandar_nomina12_f8dc822bb2.pdf

## Hyperedges (group relationships)
- **Nomina Compliance Reference Set** — reglas_sat_nomina_applied_rules, estandar_nomina12_complement_schema, guia_nomina_cfdi_40_header_rules, xslt_nomina_original_chain_sequence [INFERRED 0.88]
- **Auth And Module Access Flow** — auth_login_route_rate_limited_password_flow, auth_login_route_jwt_cookie_session, middleware_auth_session_gate, middleware_route_module_authorization, auth_logout_route_clear_session_cookie [INFERRED 0.86]
- **Client Catalog CRUD Flow** — clients_route_client_listing, clients_route_client_creation_validation, clients_route_rfc_uniqueness, clients_id_route_update_delete, clients_shared_contact_address_mapping [INFERRED 0.84]
- **Fiscal Profile Setup Flow** — parse_cif_route_post, configuracion_route_post, certificados_route_post, correo_probar_route_post, apariencia_route_post [INFERRED 0.78]
- **Cloud Backup OAuth Flows** — google_drive_login_route_get, google_drive_callback_route_get, google_drive_upload_route_post, onedrive_login_route_get, onedrive_callback_route_get, onedrive_upload_route_post [INFERRED 0.88]
- **Destructive Backup Safety Gates** — reinicializar_bd_route_post, reinicializar_bd_dual_password_check, backup_db_restore_route_post, backup_system_restore_route_post, backup_restore_confirmation_gate [INFERRED 0.82]
- **Factura issuing lifecycle** — facturas_collection_api, factura_draft_upsert_by_serie_folio, factura_timbrar_api, factura_cancelar_api, factura_email_delivery [INFERRED 0.86]
- **SAT received invoice pipeline** — facturas_recibidas_session_api, sat_download_request_flow, facturas_recibidas_verificar_api, sat_package_processing, factura_recibida_upsert, facturas_recibidas_consolidado_api [INFERRED 0.90]
- **Nomina wizard batch flow** — nomina_wizard_periodo_api, nomina_wizard_preview_api, nomina_receipt_upsert, nomina_wizard_finalizar_api, nomina_pdf_zip_delivery [INFERRED 0.88]
- **Payroll Stamping Pipeline** — nomina_wizard_validar_route_payroll_wizard_validation_api, nomina_wizard_timbrar_masivo_route_payroll_wizard_stamp_api, timbrado_masivo_route_legacy_bulk_payroll_stamping_api, payroll_csd_pac_configuration_gate, payroll_xml_generation_validation_signing_pipeline, payroll_pac_stamping_and_audit_log, payroll_receipt_state_machine [EXTRACTED 1.00]
- **Product Catalog to Quote Flow** — catalogos_productos_page_product_catalog_ui, products_route_product_catalog_api, sat_busqueda_route_sat_catalog_autocomplete_api, product_sat_catalog_learning, cotizaciones_nueva_page_quote_creation_ui, cotizaciones_editar_page_quote_edit_ui, quote_client_product_selection_workflow, quote_concept_totals_engine [INFERRED 0.84]
- **Admin Configuration and Access Control** — configuracion_page_system_configuration_ui, usuarios_route_admin_user_collection_api, usuarios_id_route_admin_user_item_api, usuarios_reset_password_route_admin_password_reset_api, admin_permissions_model, configuracion_page_backup_recovery_workflow, configuracion_page_certificate_pac_setup [EXTRACTED 1.00]
- **Outgoing Invoice Lifecycle** — facturas_nueva_invoice_creation_workflow, facturas_nueva_preview_stamp_modal, facturas_page_invoice_list_workflow, facturas_page_bulk_cfdi_zip, facturas_page_invoice_email_delivery [EXTRACTED 0.92]
- **Received Invoice SAT Download and Consolidation** — facturas_recibidas_sat_session_workflow, facturas_recibidas_profile_routing, facturas_recibidas_manual_xml_ingest, facturas_recibidas_consolidated_export, facturas_recibidas_global_consolidado [EXTRACTED 0.91]
- **Payroll Nomina Generation Validation Stamping** — nomina_wizard_mass_payroll_flow, generar_xml_nomina_generator, generar_xml_nomina_sat_totals, validar_xml_nomina_validator, validar_xml_nomina_sat_business_rules, nomina_wizard_batch_stamping [INFERRED 0.86]
- **Complete Backup Execution Flow** — respaldo_crearRespaldoSistema, backups_crearRespaldoBDCompleta, backups_createCompleteBackupArchive, backups_runBackup, drive_uploadBackupToGoogleDrive, onedrive_uploadBackupToOneDrive, sftp_uploadBackupToSftp, backups_backupHistory [EXTRACTED 1.00]
- **Nomina Validation Calculation Flow** — nomina_satNominaCatalogos, nomina_normalizeEmpleadoNominaInput, nomina_validateEmpleadoNominaInput, nomina_reglasCompatibilidadSat, nomina_armadoPeriodo, nomina_calcularNominaEmpleado [INFERRED 0.86]
- **Nomina CFDI Timbrado Representation Flow** — nomina_obtenerDatosEmpleadoNomina, nomina_obtenerDatosEmisorNomina, nomina_types, nomina_generarCadenaOriginal, nomina_sellarCadena, nomina_inyectarCertificado, nomina_inyectarSello, nomina_enviarAPAC, pdf_nominaPDF [INFERRED 0.83]
- **SAT CSD and Finkok Stamping Pipeline** — firmar_private_key_decryption, firmar_no_certificado_extraction, firmar_sha256_sello_generation, timbrar_cfdi_unsigned_builder, timbrar_cadena_original_builder, timbrar_factura_finkok_flow, timbrar_nomina_finkok_flow, csd_certificado_base64_artifact [INFERRED 0.84]
- **Received Invoices Descarga Masiva Lifecycle** — facturas_recibidas_cron_background_verification, facturas_recibidas_solicitud_sat_retry_state, facturas_recibidas_verificar_api_route, descarga_masiva_sat_service, descarga_masiva_received_cfdi_query, descarga_masiva_status_mapping, descarga_masiva_package_download [INFERRED 0.78]
- **Payroll CFDI Validation Corpus** — guia_nomina_cfdi_40_complemento_12, guia_nomina_fixed_cfdi_values, guia_nomina_complement_totals_rules, guia_nomina_receiver_rules, nomina_250525_generated_payroll_cfdi_pdf, recibo_corona_external_payroll_cfdi_pdf [INFERRED 0.81]
- **Tax Calculator Visual Reference Set** — calculadoras_arrendamiento_inmuebles_ui, calculadoras_sueldo_bruto_neto_ui, calculadoras_finiquito_ui, calculadoras_liquidacion_ui, calculadoras_isr_ui, calculadoras_ptu_ui [INFERRED 0.83]
- **XML Validation Report States** — validacion_xml_valido_report, validacion_xml_mal_formado_report, estandar_nomina12_complement_schema, guia_nomina_cfdi_40_header_rules [INFERRED 0.86]
- **Brand Identity Asset Family** — public_logo_tufisti, public_tufisti_circular, public_logo_facturador, public_favicon_16, public_favicon_32, public_android_chrome_192, public_android_chrome_512, public_apple_touch_icon [INFERRED 0.82]

## Communities (86 total, 10 thin omitted)

### Community 0 - "Quotation and API Route Handlers"
Cohesion: 0.05
Nodes (71): GET(), POST(), extractXmlAttribute(), PATCH(), Quotation Client Existence Check, Quotation Client Filter, Nested Quotation Concept Creation, Quotation Producto ID Mapping Fix (+63 more)

### Community 1 - "SAT Received Invoice Downloads"
Cohesion: 0.07
Nodes (55): DescargaMasivaSAT, EstadoSolicitudInterno, VerificacionSolicitudResult, GET(), POST(), getFielCredentialsAsBinary(), fechaCfdiComoUtc(), POST() (+47 more)

### Community 2 - "SAT Catalogs and Dashboard State"
Cohesion: 0.03
Nodes (58): cargarSesionSat, CAT_FORMA_PAGO, CAT_METODO_PAGO, CAT_MONEDA, CAT_TIPO_COMPROBANTE, [configSat, setConfigSat], ConfiguracionSatResumen, [consolidadoCargando, setConsolidadoCargando] (+50 more)

### Community 3 - "Fiscal Configuration and Certificates"
Cohesion: 0.05
Nodes (49): Header Hex Color Validation, normalizeHexColor(), POST(), Certificate File Base64 Conversion, CSD FIEL Certificate Type Selection, POST(), Boolean(), Public Configuration Projection (+41 more)

### Community 4 - "System Settings and Backup UI"
Cohesion: 0.04
Nodes (45): [activeTab, setActiveTab], APPEARANCE_COLORS, BACKUP_DESTINOS, [backupBusy, setBackupBusy], BackupDestino, [backupHistory, setBackupHistory], BackupHistoryEntry, [backupMessage, setBackupMessage] (+37 more)

### Community 5 - "Labor and Tax Calculators"
Cohesion: 0.05
Nodes (42): [active, setActive], addYears(), [aguinaldo, setAguinaldo], aguinaldoResult, annualIsr(), [arr, setArr], arrResult, CALCULATORS (+34 more)

### Community 6 - "Core CFDI and CRUD APIs"
Cohesion: 0.06
Nodes (44): CFDI XML metadata parser, Cotizacion detail API, Cotizacion conceptos transaction, Cotizacion totals recalculation, Empleado delete cascade recibos, Empleado detail API, Empleado nomina input validation, Empleados collection API (+36 more)

### Community 7 - "Quote Creation Form"
Cohesion: 0.05
Nodes (31): agregarConcepto(), Client, [clienteData, setClienteData], [clienteId, setClienteId], [clients, setClients], Concepto, [conceptos, setConceptos], conceptosCargados (+23 more)

### Community 8 - "Outgoing Invoice UI and Catalogs"
Cohesion: 0.05
Nodes (31): [cancelando, setCancelando], CATALOGO_FORMA_PAGO, CATALOGO_METODO_PAGO, CATALOGO_REGIMEN_FISCAL, CATALOGO_USO_CFDI, CfdiExtra, Concepto, [copiado, setCopiado] (+23 more)

### Community 9 - "Invoice PDF and Email Workflow"
Cohesion: 0.07
Nodes (30): buildFacturaDataPDF(), calcularConcepto(), cargarFolioPorSerie(), Client, construirDireccionReceptor(), [correo, setCorreo], correoAutoEnviado, DatosExtraidosXML (+22 more)

### Community 10 - "Quote Folio and Editing Workflow"
Cohesion: 0.06
Nodes (29): agregarConcepto(), cargarSiguienteFolio(), [clienteData, setClienteData], [clienteId, setClienteId], [clients, setClients], Concepto, [conceptos, setConceptos], conceptoVacio() (+21 more)

### Community 11 - "Payroll Batch UI"
Cohesion: 0.06
Nodes (26): [deduccionesExtra, setDeduccionesExtra], DeduccionExtra, [deduccionForm, setDeduccionForm], [failed, setFailed], [fin, setFin], [history, setHistory], HistoryItem, [historyLoading, setHistoryLoading] (+18 more)

### Community 12 - "SAT Download and Certificate Concepts"
Cohesion: 0.08
Nodes (35): SAT Regimenes Fiscales Catalog, SAT Uso CFDI Catalog, CSD Certificate Base64 Artifact, SAT Package Download, Received CFDI Query, SAT Descarga Masiva Service, SAT Request Status Mapping, Facturas Recibidas Background Verification Cron (+27 more)

### Community 13 - "Calculator UI and Client APIs"
Cohesion: 0.08
Nodes (33): Corrected Aguinaldo Result UI, Corrected Finiquito Result UI, Corrected ISR Result UI, Corrected Liquidacion Result UI, Corrected PTU Result UI, Corrected Sueldo Neto Result UI, Finiquito Calculator UI, ISR Calculator UI (+25 more)

### Community 14 - "Invoice Stamping and Email Domain"
Cohesion: 0.09
Nodes (33): Active Fiscal Configuration Profile, SAT Certificate Inspection, CSD and FIEL Credential Access, Configured SMTP Mail Transport, Monthly Invoice Accounting Close, Global Public Invoice Workflow, New Invoice Creation Workflow, Invoice Preview and Stamping Modal (+25 more)

### Community 15 - "Authentication and Dashboard Navigation"
Cohesion: 0.08
Nodes (28): Admin Bootstrap Login Fallback, JWT Cookie Session, Rate Limited Password Login Flow, Clear Auth Session Cookie, Arrendamiento de Inmuebles Calculator UI, Client Listing API, Dashboard Branding Config Fetch, Dashboard Logout Action (+20 more)

### Community 16 - "Client Catalog UI"
Cohesion: 0.09
Nodes (21): CIFParsed, Client, clientesFiltrados, clientesPaginados, [clients, setClients], createClient(), deleteClient(), [editingClient, setEditingClient] (+13 more)

### Community 17 - "Product Catalog UI"
Cohesion: 0.09
Nodes (22): [campoActivoSat, setCampoActivoSat], cancelEdit(), [claveProdServ, setClaveProdServ], [claveUnidad, setClaveUnidad], [editingProduct, setEditingProduct], fetchProducts(), formRef, handleDelete() (+14 more)

### Community 18 - "Dashboard Metrics UI"
Cohesion: 0.08
Nodes (22): [anioActual], cargarLogo(), COLORES_ESTADO, DatosDiarios, [datosDiarios, setDatosDiarios], DatosEstado, [datosEstado, setDatosEstado], [empresaNombre, setEmpresaNombre] (+14 more)

### Community 19 - "Payroll Validation Rules"
Cohesion: 0.16
Nodes (21): String(), validateEmpleadoNominaInput(), CONTRATOS_REQUIEREN_REGISTRO_PATRONAL, DEDUCCIONES_REQUIEREN_INCAPACIDAD, OTROS_PAGOS_REQUIEREN_COMPENSACION, OTROS_PAGOS_REQUIEREN_SUBSIDIO, PERCEPCIONES_JUBILACION_RETIRO, PERCEPCIONES_REQUIEREN_HORAS_EXTRA (+13 more)

### Community 20 - "Backup Execution and Cloud Uploads"
Cohesion: 0.09
Nodes (24): Backup History, cleanupLocalRetention, crearRespaldoBDCompleta, createCompleteBackupArchive, databaseUrl, restaurarRespaldoBDCompleta, runBackup, Google Drive OAuth (+16 more)

### Community 21 - "Backup Scheduler"
Cohesion: 0.16
Nodes (20): BackupScheduleFile, globalForBackupScheduler, localDateKey(), pad(), PROGRAMACION_FILE, readSchedule(), RESPALDOS_DIR, runKey() (+12 more)

### Community 22 - "Employee Nomina Catalog APIs"
Cohesion: 0.11
Nodes (17): POST(), BANCOS_SAT, clean(), normalizeEmpleadoNominaInput(), OpcionCatalogo, PERIODICIDADES_PAGO, REGIMENES_CONTRATACION, RIESGOS_PUESTO (+9 more)

### Community 23 - "OneDrive and OAuth Helpers"
Cohesion: 0.17
Nodes (17): exchangeGoogleDriveCode(), clean(), ensureOneDriveFolderPath(), exchangeOneDriveCode(), getOneDriveConfig(), graphBackupPath(), GraphDriveItem, nextValueAfterLabel() (+9 more)

### Community 24 - "Admin Users and Module Permissions"
Cohesion: 0.22
Nodes (14): signToken(), getDefaultModulesByRole(), MODULOS_SISTEMA, ModuloSistema, parseModules(), RolSistema, requireAdmin(), PUT() (+6 more)

### Community 25 - "Miscellaneous API Utilities"
Cohesion: 0.12
Nodes (6): POST(), GET(), DELETE(), GET(), adapter, globalForPrisma

### Community 26 - "Invoice Consolidation Export UI"
Cohesion: 0.13
Nodes (17): blobToBase64(), cargar, crearXlsx(), crearZipXml(), descargar(), enviar(), FacturaConsolidado, [facturas, setFacturas] (+9 more)

### Community 27 - "Employee List UI"
Cohesion: 0.11
Nodes (15): currentEmpleados, [currentPage, setCurrentPage], deleteEmpleados(), EmpleadoRow, [empleados, setEmpleados], empleadosFiltrados, fetchEmpleados(), fileInputRef (+7 more)

### Community 28 - "System Backup Archive Model"
Cohesion: 0.17
Nodes (16): nombreArchivoRespaldoBD(), BackupExecutionResult, BackupHistoryEntry, createBackupPayload(), createCompleteBackupArchive(), HISTORY_FILE, RESPALDOS_DIR, bufferToArrayBuffer() (+8 more)

### Community 29 - "Google Drive Backup Helpers"
Cohesion: 0.16
Nodes (16): clean(), createFolder(), findFolderByName(), getFolderById(), getGoogleDriveConfig(), googleDriveAuthorizeUrl(), GoogleDriveConfig, GoogleFolderResponse (+8 more)

### Community 30 - "Payroll Calculation Engine"
Cohesion: 0.19
Nodes (18): calcularDiasPagados(), calcularDiasLaborados(), calcularIsrConTarifa(), calcularNominaEmpleado(), calcularSubsidioEmpleo(), NominaEmpleadoCalculo, NominaEmpleadoSource, obtenerFactorPeriodo() (+10 more)

### Community 31 - "Backup History and Access APIs"
Cohesion: 0.25
Nodes (9): requireModule(), getBackupHistory(), buildSftpConfig(), GET(), GET(), parseFecha(), resumirEstadoPeriodo(), POST() (+1 more)

### Community 32 - "Generic Form Error Handling"
Cohesion: 0.13
Nodes (12): [error, setError], formatIssues(), [formData, setFormData], handleSubmit(), { id }, [loading, setLoading], router, [saving, setSaving] (+4 more)

### Community 33 - "Tax Constants and Setup Concepts"
Cohesion: 0.17
Nodes (17): 2026 Tax Constants, Mexico Tax and Labor Calculators, Salary and IMSS Calculation Engine, Termination PTU and Lease Calculation Engine, Certificate and PAC Setup, Employee Edit UI, Employee Creation UI, Employee List UI (+9 more)

### Community 34 - "Quote List UI"
Cohesion: 0.13
Nodes (12): Client, Cotizacion, [cotizaciones, setCotizaciones], cotizacionesPaginadas, fetchCotizaciones(), filteredCotizaciones, handleDelete(), [loading, setLoading] (+4 more)

### Community 35 - "Nomina CFDI Stamping Engine"
Cohesion: 0.14
Nodes (16): armarPeriodoNomina, calcularDiasPagados, calcularNominaEmpleado, enviarAPAC, generarCadenaOriginal Nomina, inyectarCertificado, inyectarSello, obtenerDatosEmisorNomina (+8 more)

### Community 36 - "Catalog and Quote UI Workflows"
Cohesion: 0.21
Nodes (14): CIF PDF Intake Workflow, Client Catalog UI, Product Catalog UI, Quote Edit UI, Quote Creation UI, Quote List UI, Product SAT Catalog Learning, Product CSV Import API (+6 more)

### Community 37 - "Global Invoice Process UI"
Cohesion: 0.19
Nodes (11): [anio, setAnio], buildFacturaData(), [completado, setCompletado], [correo, setCorreo], getEmpresaLogoUrl(), iniciarProceso(), [mes, setMes], MESES (+3 more)

### Community 38 - "Database Restore Commands"
Cohesion: 0.33
Nodes (9): crearRespaldoBDCompleta(), databaseUrl(), restaurarRespaldoBDCompleta(), runCommandWithInput(), restaurarRespaldoSistema(), validarRespaldoSistema(), POST(), readJsonBackup() (+1 more)

### Community 39 - "Global Invoice Period UI"
Cohesion: 0.2
Nodes (8): money(), ANIOS, FacturaGlobalPage(), MESES, PERIODICIDADES, Product, Ticket, formatMoneyMX()

### Community 40 - "Session Token and Role Model"
Cohesion: 0.22
Nodes (11): SessionPayload, signToken, verifyToken, MODULOS_SISTEMA, getDefaultModulesByRole, isRootSuperUser, parseModules, roleHasAllModules (+3 more)

### Community 41 - "JWT Verification Helpers"
Cohesion: 0.29
Nodes (8): secret, SessionPayload, verifyToken(), isRootSuperUser(), roleHasAllModules(), config, middleware(), routeModuleMap

### Community 42 - "Backup API Concepts"
Cohesion: 0.22
Nodes (10): Complete Backup Archive Download, Admin Database Backup Archive Download, Backup Destination Validation, Backup History API GET, Local Backup API GET, Backup Schedule File Persistence, Backup Schedule API, Scheduled Backup SFTP Config Sanitization (+2 more)

### Community 43 - "Cloud Backup OAuth APIs"
Cohesion: 0.24
Nodes (10): Google Drive Backup Callback API GET, Google Drive Backup Login API GET, Google Drive OAuth State Cookie, Google Drive Refresh Token Gate, Google Drive Backup Upload API POST, OneDrive Backup Callback API GET, OneDrive Backup Login API GET, OneDrive OAuth State Cookie (+2 more)

### Community 44 - "Login Page State"
Cohesion: 0.22
Nodes (7): [branding, setBranding], [email, setEmail], [error, setError], [loading, setLoading], [password, setPassword], router, search

### Community 45 - "Factura PDF Component"
Cohesion: 0.25
Nodes (8): Concepto, FacturaPDFProps, fmt(), importeConcepto, styles, tasaIva, toNumber(), valorUnitario

### Community 46 - "SFTP Backup Client"
Cohesion: 0.33
Nodes (8): nodeRequire, SftpBackupConfig, SftpClientConstructor, SftpClientLike, testSftpConnection(), uploadBackupToSftp(), validateSftpConfig(), withSftpClient()

### Community 47 - "Authenticated Admin Resolution"
Cohesion: 0.36
Nodes (7): getServerSession(), Authenticated Admin Resolution, Plaintext and Bcrypt Password Check, Foreign Key Ordered Database Cleanup, getAuthenticatedAdmin(), isAdminRole(), POST()

### Community 48 - "Seed and Restore Utilities"
Cohesion: 0.29
Nodes (8): createUser(), deleteUser(), loadConfig(), loadUsers(), resetDatabase(), restoreBackup(), updateUser(), uploadCert()

### Community 49 - "Bulk Invoice Download UI"
Cohesion: 0.25
Nodes (8): blobToBase64(), crearPdfUnidoFacturas(), crearZipFacturas(), handleDescargarPDF(), handleDescargarSeleccionadas(), handleEnviarConsolidado(), NumeroALetras(), parseXmlToFactura()

### Community 50 - "Backup Runtime Utilities"
Cohesion: 0.29
Nodes (7): appendBackupHistory(), BackupDestino, bufferToArrayBuffer(), cleanupLocalRetention(), runBackup(), DESTINOS_VALIDOS, GET()

### Community 51 - "Admin Configuration Concepts"
Cohesion: 0.32
Nodes (8): Admin Permissions Model, Backup and Recovery Workflow, Email and Appearance Settings, System Configuration UI, Public Branding API, Admin User Item API, Admin Password Reset API, Admin User Collection API

### Community 52 - "Folio Sequencing API"
Cohesion: 0.52
Nodes (4): FolioRecord, formatFolio(), getNextFolioFromRecords(), GET()

### Community 53 - "Invoice Detail Actions UI"
Cohesion: 0.38
Nodes (7): buildFacturaData(), fmtFechaHora(), getEmpresaLogoUrl(), handleDescargaMasiva(), handleDescargar(), handleEnviarCorreo(), numeroALetra()

### Community 54 - "Dashboard and Metadata Concepts"
Cohesion: 0.33
Nodes (7): Dashboard Operational KPIs, Spanish Root Layout, 2026 Stored Invoice Metadata Record, Next.js SVG Logo, Vercel SVG Logo, Browser Invoice Consolidation Limits, Next.js Bootstrap Project

### Community 55 - "Consolidated XLSX Export"
Cohesion: 0.33
Nodes (6): crearConsolidadoXlsx(), extraerFechaCfdi(), facturaFechaKey(), fechaCfdiKey(), fmtFecha(), handleDescargarConsolidado()

### Community 56 - "Backup Settings Actions"
Cohesion: 0.4
Nodes (5): handleBackupDestino(), loadBackupHistory(), restoreFullDatabase(), saveLocalBackup(), saveSftpBackup()

### Community 57 - "Appearance Settings Actions"
Cohesion: 0.4
Nodes (5): loadInitialData(), normalizeConfig(), normalizeHexColor(), saveAppearance(), saveConfig()

### Community 58 - "Button Component"
Cohesion: 0.4
Nodes (3): Props, Variant, variants

### Community 59 - "Restore API Concepts"
Cohesion: 0.5
Nodes (5): Database Backup Restore API POST, SQL or ZIP Database Backup Reader, Backup Restore Confirmation Gate, JSON or ZIP System Backup Reader, System Backup Restore API POST

### Community 60 - "SAT Nomina Rule Concepts"
Cohesion: 0.4
Nodes (5): normalizeEmpleadoNominaInput, periodicidadCompatibleConTipoNomina, Reglas Compatibilidad SAT Nomina, SAT_NOMINA_CATALOGOS, validateEmpleadoNominaInput

### Community 61 - "XML Parsing Helpers"
Cohesion: 0.5
Nodes (4): getAttr(), parseXmlParaPdf(), extractCfdiData(), extraerDatosXML()

### Community 64 - "Login and Session Concepts"
Cohesion: 0.5
Nodes (4): Login Authentication Workflow, Public Branding on Login, Access Denied Page, Inactivity Session Guard

### Community 67 - "XML Upload and Sync UI"
Cohesion: 0.67
Nodes (3): cargar, handleSincronizar(), handleSubirXML()

### Community 68 - "Invoice Stamp and Cancel UI"
Cohesion: 0.67
Nodes (3): cargar, handleCancelar(), handleTimbrar()

### Community 69 - "Folio Sequence Concepts"
Cohesion: 0.67
Nodes (3): Cotizaciones siguiente folio API, Facturas siguiente folio API, Folio sequence from records

## Ambiguous Edges - Review These
- `Dashboard Module Navigation` → `Globe SVG Icon`  [AMBIGUOUS]
  public/globe.svg · relation: conceptually_related_to
- `SAT Package Download` → `ssh2-sftp-client Type Declaration`  [AMBIGUOUS]
  src/types/ssh2-sftp-client.d.ts · relation: conceptually_related_to

## Knowledge Gaps
- **562 isolated node(s):** `nextConfig`, `eslintConfig`, `routeModuleMap`, `config`, `ConnectConfig` (+557 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Dashboard Module Navigation` and `Globe SVG Icon`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `SAT Package Download` and `ssh2-sftp-client Type Declaration`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `String()` connect `Payroll Validation Rules` to `Quotation and API Route Handlers`, `SAT Received Invoice Downloads`, `Fiscal Configuration and Certificates`, `Labor and Tax Calculators`, `Dashboard Metrics UI`, `Backup Scheduler`, `Employee Nomina Catalog APIs`, `OneDrive and OAuth Helpers`, `Admin Users and Module Permissions`, `Miscellaneous API Utilities`, `Google Drive Backup Helpers`, `Payroll Calculation Engine`, `Backup History and Access APIs`, `Database Restore Commands`, `Global Invoice Period UI`, `JWT Verification Helpers`, `Authenticated Admin Resolution`, `Folio Sequencing API`, `Appearance Settings Actions`?**
  _High betweenness centrality (0.221) - this node is a cross-community bridge._
- **Why does `handleEnviar()` connect `Invoice PDF and Email Workflow` to `Factura PDF Component`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `formatMoneyMX()` connect `Global Invoice Period UI` to `Labor and Tax Calculators`, `Quote Creation Form`, `Invoice PDF and Email Workflow`, `Quote Folio and Editing Workflow`, `Payroll Batch UI`, `Product Catalog UI`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Are the 59 inferred relationships involving `String()` (e.g. with `num()` and `FacturaGlobalPage()`) actually correct?**
  _`String()` has 59 INFERRED edges - model-reasoned connections that need verification._
- **What connects `nextConfig`, `eslintConfig`, `routeModuleMap` to the rest of the system?**
  _562 weakly-connected nodes found - possible documentation gaps or missing edges._