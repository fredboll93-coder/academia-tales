import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        clasesGrabadas: resolve(__dirname, 'clases-grabadas.html'),
        clasesGrabadasAlumno: resolve(__dirname, 'clasesGrabadasAlumno.html'),
        contenidoCarpeta: resolve(__dirname, 'contenido-carpeta.html'),
        crearSimulacro: resolve(__dirname, 'crear-simulacro.html'),
        detalleUniversidad: resolve(__dirname, 'detalleUniversidad.html'),
        estudiante: resolve(__dirname, 'estudiante.html'),
        examen: resolve(__dirname, 'examen.html'),
        materiales: resolve(__dirname, 'materiales.html'),
        materialesAlumno: resolve(__dirname, 'materialesAlumno.html'),
        simulacros: resolve(__dirname, 'simulacros.html'),
        simulacrosAlumno: resolve(__dirname, 'simulacrosAlumno.html'),
        universidad: resolve(__dirname, 'universidad.html'),
        verCartilla: resolve(__dirname, 'ver-cartilla.html'),
        verSimulacroSolucionario: resolve(__dirname, 'ver-simulacro-solucionario.html'),
      },
    },
  },
});
