# Documento de Alcance de Solucion

## 1. Proposito del documento

Este documento define el alcance funcional y tecnico de una solucion de gestion documental asistida por IA, pensada para ser implementada por un equipo de desarrollo usando Mendix como plataforma principal y Codex como acelerador de analisis, construccion, pruebas y refinamiento de entregables.

El objetivo es que el equipo cuente con una base suficientemente detallada para:

- entender la vision de negocio y el problema a resolver;
- identificar actores, modulos, pantallas y flujos principales;
- disenar el modelo de datos y los servicios necesarios;
- convertir el alcance en backlog de historias, epicas y sprints;
- implementar una primera version operativa y escalable.

## 2. Vision de la solucion

La solucion centraliza operaciones y expedientes documentales, permite cargar documentos multiformato, ejecutar extraccion automatica de datos con IA, aplicar validaciones cruzadas, detectar casos que requieren revision manual, consultar la informacion mediante busqueda conversacional con evidencia, y generar reportes operacionales.

La plataforma contempla dos dimensiones:

- Backoffice operativo y analitico para usuarios internos.
- Portales especializados orientados a clientes o usuarios finales, por ejemplo un portal COMEX o un portal de preadmision clinica.

## 3. Objetivo de negocio

La solucion busca reducir tiempos y errores en procesos documentales intensivos, mejorando:

- velocidad de captura y procesamiento;
- calidad y consistencia de datos extraidos;
- trazabilidad de documentos y decisiones;
- capacidad de auditoria y control;
- acceso a la informacion mediante lenguaje natural;
- configuracion por empresa, caso de uso o linea de negocio.

## 4. Problema que resuelve

La solucion responde a escenarios donde hoy existen:

- documentos dispersos entre correos, carpetas y sistemas aislados;
- extraccion manual de campos clave;
- revisiones humanas poco estandarizadas;
- dificultad para encontrar evidencia puntual dentro de expedientes;
- baja trazabilidad de aprobaciones, rechazos y observaciones;
- escasa capacidad de configuracion por cliente o empresa.

## 5. Alcance funcional general

La version objetivo incluye los siguientes bloques funcionales:

1. Gestion de usuarios, autenticacion y roles.
2. Administracion de empresas o cuentas.
3. Creacion de operaciones o expedientes.
4. Carga de documentos PDF e imagenes.
5. Procesamiento documental asistido por IA.
6. Extraccion de texto, campos estructurados y niveles de confianza.
7. Deteccion de PII y senales de firma.
8. Validaciones automaticas por reglas y comparacion entre documentos.
9. Cola de revision y cambio de estados.
10. Vista detalle de operacion con edicion controlada.
11. Comentarios y checklist por documento.
12. Busqueda conversacional con evidencia.
13. Reporteria operacional con filtros y exportables.
14. Configuracion de prompts, proveedor y modelo IA por empresa.
15. Portales externos especializados por vertical de negocio.

## 6. Actores y perfiles

### 6.1 Capturador

Responsable de crear operaciones, cargar documentos y disparar el procesamiento inicial.

Permisos esperados:

- crear operaciones;
- adjuntar documentos;
- consultar sus operaciones o las asignadas segun reglas de negocio;
- visualizar resultado de extraccion y estado general;
- no administrar reglas ni configuracion global.

### 6.2 Analista

Responsable de revisar operaciones, validar consistencia, buscar evidencia, generar reportes y administrar configuraciones maestras.

Permisos esperados:

- acceder al dashboard analitico;
- consultar todas las operaciones habilitadas;
- cambiar estados;
- ejecutar o relanzar validaciones;
- editar campos extraidos cuando aplique;
- comentar documentos;
- usar busqueda IA;
- generar reportes;
- administrar usuarios, empresas, reglas, flujos y configuracion IA.

### 6.3 Cliente final o usuario externo

Usuario que interactua desde un portal autoservicio especializado.

Permisos esperados:

- cargar documentos propios;
- revisar el avance de su caso;
- firmar o confirmar acciones;
- consultar a un asistente orientado al proceso;
- descargar comprobantes o resguardos.

### 6.4 Administrador funcional

Puede ser una variante del analista o un rol adicional en Mendix. Su foco es parametrizacion, gobierno y operacion.

## 7. Modulos funcionales

### 7.1 Modulo de autenticacion y sesion

Funciones:

- login;
- cierre de sesion;
- control por rol;
- persistencia de sesion;
- opcion multilenguaje.

Resultado esperado:

- cada usuario ve solo las capacidades habilitadas para su perfil.

### 7.2 Modulo de empresas

Funciones:

- alta de empresa;
- listado y mantenimiento;
- asignacion de usuarios a empresa;
- configuracion IA por empresa;
- segmentacion de reglas por empresa.

Resultado esperado:

- la plataforma opera en esquema multiempresa con aislamiento funcional y parametrico.

### 7.3 Modulo de operaciones

Funciones:

- alta de operacion;
- captura de datos del cliente;
- asociacion a empresa;
- carga de documentos;
- procesamiento asincrono;
- consulta de estado y detalle.

Datos minimos esperados:

- nombre del cliente;
- identificacion fiscal o personal;
- empresa;
- documentos adjuntos;
- usuario creador;
- fecha de creacion;
- estado del expediente.

### 7.4 Modulo de gestion documental

Funciones:

- almacenamiento de documentos;
- miniaturas;
- texto extraido;
- campos estructurados por IA;
- deteccion de PII;
- deteccion de firma;
- comentarios por documento.

Tipos de documento contemplados:

- factura;
- transporte;
- identidad;
- solicitud;
- otros.

### 7.5 Modulo de procesamiento IA

Funciones:

- extraccion documental;
- asignacion de confianza global y por campo;
- resumen estructurado de la operacion;
- prompts configurables;
- seleccion de proveedor y modelo.

Proveedores contemplados en el alcance:

- OpenAI;
- Gemini;
- Anthropic.

### 7.6 Modulo de validacion automatica

Funciones:

- reglas de validacion por empresa;
- comparacion entre documentos;
- severidad WARN o ERROR;
- tolerancias numericas o porcentuales;
- determinacion de mismatch o no verificable;
- resumen de hallazgos.

Ejemplos de reglas:

- consistencia de monto;
- consistencia de identificacion;
- consistencia de mercaderia;
- consistencia de fechas;
- comparacion de campos equivalentes entre dos tipos documentales.

### 7.7 Modulo de revision operacional

Funciones:

- cola de revision;
- cambio de estado;
- operaciones con baja confianza;
- checklist por tipo documental;
- comentarios por documento;
- relanzamiento de validacion;
- relanzamiento de extraccion.

Estados minimos:

- Pendiente OCR;
- En validacion;
- Aprobada;
- Rechazada.

### 7.8 Modulo de busqueda conversacional

Funciones:

- consulta en lenguaje natural;
- busqueda por operacion o por empresa;
- modos de busqueda estricta o amplia;
- respuesta generada por IA;
- evidencias con snippet, miniatura y documento fuente;
- cache temporal por usuario.

Resultado esperado:

- el analista puede responder preguntas operativas sin recorrer manualmente todos los documentos.

### 7.9 Modulo de reportes

Funciones:

- generacion de reportes operacionales;
- filtros por rango de fecha y empresa;
- seleccion o inferencia del tipo de reporte a partir de un prompt;
- visualizacion grafica;
- exportacion.

Tipos de reporte ya identificados:

- evolucion de operaciones;
- documentos por tipo;
- top clientes;
- documentos por cliente;
- operaciones por cliente por mes;
- dashboard de distribucion;
- calidad de validacion.

### 7.10 Modulo de seguridad documental

Funciones:

- deteccion de PII;
- ocultamiento visual de PII;
- deteccion de firma;
- configuracion de flujos de revision por tipo documental;
- gobierno de acceso por rol y por tipo de documento.

### 7.11 Portales especializados

Se contemplan al menos dos experiencias especializadas:

- Portal COMEX.
- Portal Preadmision Salud.

Estas experiencias pueden compartir motor comun, pero requieren UX, textos, reglas y asistentes propios.

## 8. Inventario de pantallas objetivo

### 8.1 Acceso y landing

- Landing de producto o portada de acceso.
- Pantalla de login.
- Variante de login por campana o demo, si aplica.

### 8.2 Dashboard interno

- Inicio de operaciones.
- Nueva operacion.
- Detalle de operacion.
- Busqueda IA.
- Reportes IA.
- Revision.
- Usuarios.
- Empresas.
- Reglas de validacion.
- Seguridad documental.
- Perfil.

### 8.3 Portal externo COMEX

- Home del portal.
- Carga de documentos.
- Resumen extraido.
- Revision previa.
- Firma o confirmacion.
- Resultado final.
- Asistente conversacional.

### 8.4 Portal externo Salud

- Identificacion del paciente.
- Carga documental.
- Revision de datos.
- Firma o consentimiento.
- Confirmacion final con comprobante o QR.
- Asistente de dudas.
- Asistente de confirmacion o reagendamiento de cita.

## 9. Detalle funcional por pantalla

### 9.1 Login

Objetivo:

- autenticar usuario y determinar rol.

Componentes:

- usuario;
- contrasena;
- accion iniciar sesion;
- manejo de error;
- selector de idioma.

Criterios:

- si las credenciales son validas, redirige al modulo principal segun rol;
- si no son validas, informa error sin revelar detalles sensibles.

### 9.2 Inicio de operaciones

Objetivo:

- listar operaciones y permitir acceso al detalle.

Componentes:

- tabla o grid;
- filtros por estado, empresa, cliente y fecha;
- contador de documentos;
- acceso a detalle;
- indicadores de revision requerida.

### 9.3 Nueva operacion

Objetivo:

- registrar un expediente y disparar su procesamiento.

Componentes:

- datos del cliente;
- selector de empresa;
- carga de multiples archivos;
- captura por camara en movil;
- validacion de obligatorios;
- confirmacion de alta.

Reglas:

- se debe adjuntar al menos un documento;
- empresa y datos del cliente son obligatorios;
- al guardar, se crea la operacion y luego se dispara el procesamiento asincrono.

### 9.4 Detalle de operacion

Objetivo:

- centralizar toda la informacion de una operacion.

Componentes:

- encabezado con identificacion, fecha, empresa y estado;
- indicadores de revision requerida;
- resumen de validacion;
- listado de documentos;
- miniatura y acceso al archivo;
- texto extraido;
- campos estructurados;
- edicion de campos;
- comentarios;
- visualizacion de PII y firma;
- accion reprocessar extraccion;
- accion ejecutar validacion;
- accion enviar por correo o copiar valores, si se habilita.

Reglas:

- el usuario debe poder ver evidencias por documento;
- la edicion manual debe quedar auditada en la implementacion final;
- las acciones de reproceso deben quedar restringidas a perfiles autorizados.

### 9.5 Revision

Objetivo:

- gestionar los casos que requieren analisis humano.

Componentes:

- tabla de operaciones en revision;
- cambio de estado;
- acceso al detalle;
- filtros;
- mensajes de error o exito.

### 9.6 Busqueda IA

Objetivo:

- permitir preguntas en lenguaje natural sobre el universo documental.

Componentes:

- historial conversacional;
- selector de operacion;
- filtro por empresa;
- modo estricto o amplio;
- caja de pregunta;
- respuesta del asistente;
- evidencias con snippets y miniaturas;
- metricas de confianza y cantidad de evidencias.

### 9.7 Reportes IA

Objetivo:

- generar vistas operacionales accionables.

Componentes:

- prompt libre;
- accesos rapidos a reportes frecuentes;
- filtros;
- grafico;
- KPIs;
- tabla de resultados;
- exportacion CSV o PDF.

### 9.8 Usuarios

Objetivo:

- administrar altas, cambios y asignaciones.

Componentes:

- listado;
- alta y edicion;
- rol;
- empresa asociada;
- activacion o desactivacion en version definitiva.

### 9.9 Empresas

Objetivo:

- administrar tenants o cuentas.

Componentes:

- listado;
- alta;
- configuracion IA por empresa;
- parametros de negocio por empresa.

### 9.10 Reglas de validacion

Objetivo:

- parametrizar controles automaticos.

Componentes:

- reglas maestras por tipo;
- reglas de comparacion campo a campo;
- severidad;
- tolerancias;
- activacion o desactivacion;
- filtro por empresa.

### 9.11 Seguridad documental

Objetivo:

- definir los flujos de revision y controles de informacion sensible.

Componentes:

- configuracion por tipo documental;
- indicador de revision obligatoria;
- nombre de flujo;
- checklist;
- visualizacion de hallazgos PII y firma.

### 9.12 Perfil

Objetivo:

- permitir que el usuario consulte y mantenga su informacion basica.

## 10. Flujos end to end

### 10.1 Flujo principal de captura y procesamiento

1. El capturador inicia sesion.
2. Ingresa a Nueva operacion.
3. Completa datos del cliente y empresa.
4. Adjunta uno o varios documentos.
5. Guarda la operacion.
6. El sistema registra operacion y documentos.
7. Se dispara procesamiento asincrono.
8. La IA extrae texto y campos.
9. El sistema calcula confianza, PII y firma.
10. Se genera resumen de operacion.
11. Si la confianza cae bajo el umbral o existen hallazgos relevantes, la operacion pasa a En validacion.
12. Si no requiere intervencion, puede quedar Aprobada.

### 10.2 Flujo de revision manual

1. El analista abre la cola de revision.
2. Selecciona una operacion.
3. Revisa resumen, campos y documentos.
4. Consulta checklist segun tipo documental.
5. Agrega comentarios si corresponde.
6. Corrige campos o relanza procesos si aplica.
7. Ejecuta validacion.
8. Cambia estado a Aprobada o Rechazada.

### 10.3 Flujo de validacion automatica

1. El sistema obtiene reglas activas para la empresa.
2. Identifica los documentos candidatos por tipo.
3. Ejecuta comparaciones.
4. Marca cada hallazgo como OK, WARN o ERROR.
5. Genera un resumen consolidado.
6. Expone resultados en el detalle de operacion y en reportes.

### 10.4 Flujo de busqueda IA

1. El analista abre Busqueda IA.
2. Define si busca sobre una operacion, una empresa o todo el universo permitido.
3. Escribe una pregunta.
4. El sistema localiza coincidencias relevantes.
5. Se arma contexto con evidencias.
6. La IA genera respuesta.
7. Se muestran snippets, miniaturas y documentos usados.

### 10.5 Flujo de portal externo

1. El usuario externo accede a su portal.
2. Inicia un tramite o retoma uno existente.
3. Carga documentos.
4. Visualiza datos extraidos o resumidos.
5. Completa o confirma informacion faltante.
6. Firma o acepta el flujo cuando aplique.
7. Recibe confirmacion y comprobante.
8. Puede usar un asistente para resolver dudas o acciones contextuales.

## 11. Reglas de negocio identificadas

### 11.1 Reglas generales

- una operacion debe pertenecer a una empresa;
- una operacion debe tener al menos un documento;
- solo el capturador crea operaciones;
- solo el analista puede usar busqueda IA y administrar catalogos;
- toda operacion debe tener estado;
- el sistema debe conservar trazabilidad documental.

### 11.2 Reglas de procesamiento

- la extraccion puede ser asincrona;
- los documentos sin extraccion previa deben procesarse;
- la confianza se guarda a nivel global y por campo;
- cuando la confianza es inferior al umbral configurado, la operacion requiere revision;
- se detecta PII sobre texto y campos;
- se detectan senales de firma por heuristica y opcionalmente por IA.

### 11.3 Reglas de validacion

- las reglas son configurables por empresa;
- una regla puede aplicar a todos los documentos o a tipos especificos;
- la severidad puede ser advertencia o error;
- las comparaciones pueden ser exactas, por texto normalizado o numericas;
- puede definirse tolerancia absoluta o porcentual.

### 11.4 Reglas de seguridad

- las claves de proveedores IA deben almacenarse cifradas;
- las sesiones deben ser seguras;
- debe existir control de acceso por rol;
- la informacion sensible debe poder ocultarse en pantalla;
- la descarga de documentos debe respetar permisos.

## 12. Modelo de datos conceptual

### 12.1 Entidades maestras

- Usuario
- Empresa
- Configuracion IA Empresa
- Setting de aplicacion

### 12.2 Entidades operativas

- Operacion
- Documento
- Comentario Documento
- Flujo de revision documental

### 12.3 Entidades de reglas

- Regla de validacion
- Regla de validacion campo a campo

### 12.4 Atributos clave esperados

Usuario:

- id;
- username;
- password;
- rol;
- empresa.

Empresa:

- id;
- nombre;
- fechas de creacion y actualizacion.

Operacion:

- id;
- nombre cliente;
- identificacion cliente;
- empresa;
- resumen IA;
- estado;
- requiere revision;
- razon de revision;
- resumen de validacion;
- fecha de validacion;
- usuario creador;
- fecha de creacion.

Documento:

- id;
- operacion;
- nombre archivo;
- mime type;
- url almacenamiento;
- url miniatura;
- texto extraido;
- campos extraidos;
- indicador PII;
- hallazgos PII;
- indicador firma;
- pistas de firma;
- confianza global;
- confianza por campo;
- fecha de creacion.

## 13. Integraciones requeridas

### 13.1 IA generativa y extraccion

- proveedor LLM para extraccion documental;
- proveedor LLM para respuesta conversacional;
- capacidad multi proveedor;
- seleccion por empresa.

### 13.2 Almacenamiento documental

- repositorio para PDF e imagenes;
- acceso a miniaturas;
- lectura segura para reproceso.

### 13.3 Base de datos transaccional

- persistencia relacional;
- soporte multiempresa;
- consultas para reporteria y busqueda.

### 13.4 Servicios opcionales

- correo;
- firma electronica;
- OCR especializado;
- servicios de identidad;
- QR o comprobantes;
- telemetria y auditoria.

## 14. Enfoque de implementacion con Mendix + Codex

### 14.1 Rol de Mendix

Mendix debe utilizarse como capa principal de construccion empresarial para:

- modelo de dominio;
- seguridad por roles;
- paginas y navegacion;
- workflows y microflows;
- conectores a servicios externos;
- administracion y operacion del aplicativo.

### 14.2 Rol de Codex

Codex debe utilizarse como acelerador para:

- refinamiento del alcance y backlog;
- generacion de especificaciones tecnicas;
- ayuda en modelado de APIs e integraciones;
- generacion de artefactos de prueba;
- apoyo en prompts, mappings y reglas;
- asistencia en componentes custom cuando Mendix requiera extensibilidad.

### 14.3 Distribucion recomendada

Mendix:

- experiencia de usuario;
- dominio y persistencia;
- permisos;
- flujos operativos;
- administracion de catalogos;
- pages para backoffice y portales.

Servicios externos o custom:

- extraccion IA;
- busqueda semantica si se requiere mayor precision;
- almacenamiento documental;
- firma digital;
- adaptadores de proveedor.

Codex:

- diseno de historias;
- generacion de pseudo codigo, mappings y pruebas;
- apoyo al equipo en integraciones y hardening.

## 15. Arquitectura funcional objetivo

La arquitectura funcional recomendada se compone de:

1. Frontend web interno.
2. Frontend portal externo.
3. Capa de logica Mendix.
4. Servicios de procesamiento documental.
5. Servicios IA de extraccion y respuesta.
6. Persistencia transaccional.
7. Repositorio documental.
8. Capa de seguridad, cifrado y auditoria.

## 16. Requerimientos no funcionales

### 16.1 Seguridad

- autenticacion segura;
- sesiones protegidas;
- cifrado de secretos;
- control por rol;
- auditoria de acciones criticas;
- proteccion de datos sensibles.

### 16.2 Rendimiento

- carga de expedientes con multiples archivos;
- procesamiento asincrono;
- capacidad de cola para evitar bloqueos del front;
- tiempos razonables en busqueda y reportes.

### 16.3 Escalabilidad

- diseno multiempresa;
- desacoplar procesamiento IA del front;
- soporte a aumento de volumen documental.

### 16.4 Observabilidad

- logs de procesamiento;
- trazabilidad por operacion;
- monitoreo de errores;
- metricas de uso y tiempos.

### 16.5 Mantenibilidad

- reglas parametrizables;
- configuracion por empresa;
- separacion clara entre UX, logica y servicios;
- documentacion viva respaldada por Codex.

## 17. Alcance MVP recomendado

Para una primera salida productiva se recomienda incluir:

1. Login y roles.
2. Empresas.
3. Alta de operacion.
4. Carga documental.
5. Extraccion IA basica.
6. Confianza y marca de revision.
7. Detalle de operacion.
8. Cola de revision.
9. Reglas de validacion basicas.
10. Busqueda IA sobre operaciones.
11. Reporte de evolucion operacional.
12. Seguridad documental basica.

## 18. Alcance fase 2 recomendado

- edicion avanzada de campos con auditoria;
- portal COMEX completo;
- portal salud completo;
- firma electronica integrada;
- exportables avanzados;
- dashboard ejecutivo;
- reglas mas sofisticadas;
- SLA y asignacion de tareas;
- notificaciones.

## 19. Exclusiones iniciales sugeridas

Salvo que negocio lo solicite expresamente, se recomienda dejar fuera del MVP:

- BPM complejo multiaprobador;
- integracion profunda con ERP core;
- firma certificada con multiples proveedores simultaneos;
- analitica predictiva avanzada;
- apps moviles nativas;
- multiidioma completo en todos los portales.

## 20. Riesgos y consideraciones

- calidad variable de documentos fuente;
- dependencia de costos y latencia de proveedores IA;
- necesidad de definir modelo de gobierno de prompts;
- necesidad de auditar correcciones manuales;
- sensibilidad regulatoria por manejo de PII;
- necesidad de definir claramente el perimetro multiempresa y permisos.

## 21. Supuestos de preventa

Este documento asume que:

- la solucion sera web responsive;
- Mendix sera la plataforma principal de orquestacion y experiencia;
- los servicios IA podran consumirse por API;
- existira almacenamiento documental externo o gestionado;
- los flujos demo de COMEX y Salud representan verticales reutilizables sobre un core comun;
- la version definitiva requerira endurecimiento de seguridad, auditoria y operacion.

## 22. Backlog inicial sugerido por epicas

### Epica 1. Seguridad y acceso

- autenticacion;
- roles;
- sesion;
- perfil.

### Epica 2. Core multiempresa

- CRUD de empresas;
- asignacion de usuarios;
- segregacion por empresa.

### Epica 3. Operaciones y documentos

- alta de operacion;
- carga multiple;
- almacenamiento;
- detalle de expediente.

### Epica 4. IA de extraccion

- conector IA;
- prompts;
- parsing de campos;
- score de confianza.

### Epica 5. Revision y validacion

- cola;
- estados;
- reglas;
- comentarios;
- checklist.

### Epica 6. Busqueda y reporteria

- busqueda conversacional;
- evidencia;
- reportes;
- exportacion.

### Epica 7. Portales externos

- portal COMEX;
- portal Salud;
- firma y confirmaciones.

## 23. Criterio de exito del proyecto

La solucion se considerara exitosa cuando permita:

- crear y procesar operaciones extremo a extremo;
- extraer datos de documentos con trazabilidad;
- identificar automaticamente casos para revision;
- consultar evidencia documental por lenguaje natural;
- generar reportes operacionales;
- administrar reglas y configuracion por empresa;
- habilitar una experiencia portal adaptada al caso de uso.

## 24. Recomendacion final

La solucion debe abordarse como un producto modular con un core comun documental y capas especializadas por vertical. Mendix ofrece velocidad y gobierno para construir el sistema operacional, mientras Codex debe utilizarse para acelerar analisis, especificacion, integracion y calidad de entrega.

La recomendacion para el equipo es construir primero el core transversal y luego activar experiencias verticales, evitando desarrollar portales aislados sin una base comun de entidades, reglas y servicios.

## 25. Anexo tecnico - Prompts actuales de la aplicacion

Este anexo documenta los prompts base identificados en la aplicacion actual. Se incluyen como referencia tecnica para el equipo de desarrollo y no deben considerarse inmutables. En la implementacion definitiva se recomienda versionarlos, gobernarlos por entorno y permitir su ajuste controlado por empresa o linea de negocio.

### 25.1 Consideraciones de implementacion

- la aplicacion ya soporta prompts configurables por empresa para extraccion y busqueda;
- si existe un prompt personalizado, el sistema lo antepone al prompt base obligatorio;
- el prompt base impone formato de salida y reglas minimas de comportamiento;
- estos prompts deben tratarse como configuracion funcional versionable y no como texto duro definitivo de negocio.

### 25.2 Prompt base actual de extraccion documental

Referencia funcional:

- uso tecnico actual en extraccion documental;
- admite override mediante `extractionPrompt` por empresa;
- el sistema exige respuesta estructurada en JSON.

Texto actual:

```text
Analiza este documento (incluye casos clínicos como orden de hospitalización) y responde SOLO JSON con:
{
  "tipo_documento": "...",
  "campos_relevantes": {"clave":"valor"},
  "resumen": "...",
  "confianza_global": 0.0-1.0,
  "confianza_campos": {"campos_relevantes.clave": 0.0-1.0}
}
Si no puedes leer algo, déjalo en null.
Si el documento es una orden de hospitalización, intenta extraer explícitamente:
- nombre_paciente
- rut_paciente
- fecha_cirugia (si existe)
- doctor_firmante / medico_tratante
- diagnostico / procedimiento / especialidad
- centro_medico / fecha_emision / indicaciones
Incluye estos campos dentro de "campos_relevantes".
```

Regla actual de composicion:

- si existe un `extractionPrompt` personalizado para la empresa, el sistema compone el mensaje final como:

```text
[Prompt personalizado de la empresa]

Formato de salida obligatorio:
[Prompt base de extraccion]
```

### 25.3 Prompt base actual de busqueda IA

Referencia funcional:

- uso tecnico actual en respuesta conversacional;
- admite override mediante `searchPrompt` por empresa;
- restringe la respuesta al contexto recuperado por el motor de busqueda.

Texto actual en espanol:

```text
Eres un agente experto en operaciones bancarias.
Responde en español con precisión basado SOLO en este contexto.
Si falta información, dilo explícitamente.
Si el usuario pregunta si algo existe o coincide, empieza con una conclusión directa (Sí/No/No hay evidencia suficiente) y luego explica brevemente.
Si la pregunta pide detalle médico/quirúrgico, prioriza campos y texto de procedimientos/intervenciones y responde de forma explícita.
Incluye una sección final "referencias" con los IDs de operación/documento usados.
```

Texto actual en ingles:

```text
You are an expert in banking operations and document retrieval.
Respond in English with precision based ONLY on this context.
If information is missing, state it explicitly.
If the user asks whether something exists or matches, start with a direct conclusion (Yes/No/Not enough evidence) and then explain briefly.
If the question asks for a medical/surgery detail, prioritize fields and text that mention procedures/interventions and answer explicitly.
Include a final section called "references" with operation/document IDs used.
```

Regla actual de composicion:

- si existe un `searchPrompt` personalizado para la empresa, el sistema compone el mensaje final como:

```text
[Prompt personalizado de la empresa]

Reglas obligatorias:
[Prompt base de busqueda]
```

### 25.4 Parametrizacion actual soportada por la aplicacion

La aplicacion actual ya permite parametrizar por empresa:

- proveedor de extraccion;
- modelo de extraccion;
- prompt de extraccion;
- proveedor de busqueda;
- modelo de busqueda;
- prompt de busqueda;
- claves API por proveedor.

### 25.5 Recomendacion para el alcance definitivo

En el alcance funcional definitivo se recomienda mantener este anexo y agregar una politica de gobierno de prompts con:

- versionado;
- aprobacion por ambiente;
- trazabilidad de cambios;
- pruebas de regresion por tipo documental;
- catalogo de prompts por vertical;
- estrategia de rollback ante degradacion de resultados.
