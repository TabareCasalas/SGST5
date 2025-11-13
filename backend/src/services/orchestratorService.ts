import axios from 'axios';

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3002';

interface ProcessVariables {
  [key: string]: any;
}

interface ProcessResult {
  instanceId: string;
  businessKey?: string;
}

/**
 * Inicia un proceso en Camunda a través del orchestrator
 */
export async function iniciarProcesoEnCamunda(
  processKey: string,
  variables: ProcessVariables
): Promise<ProcessResult> {
  try {
    const response = await axios.post(
      `${ORCHESTRATOR_URL}/api/procesos/iniciar`,
      {
        processKey,
        variables,
      },
      {
        timeout: 10000,
      }
    );

    return {
      instanceId: response.data.instanceId || response.data.id,
      businessKey: response.data.businessKey,
    };
  } catch (error: any) {
    console.error('Error al iniciar proceso en Camunda:', error.message);
    
    // Si el orchestrator no está disponible, lanzamos el error
    // pero el código que llama debe manejarlo
    throw new Error(
      `Error al iniciar proceso ${processKey} en Camunda: ${error.response?.data?.error || error.message}`
    );
  }
}

/**
 * Completa una tarea en Camunda a través del orchestrator
 */
export async function completarTareaEnCamunda(
  processInstanceId: string,
  variables: ProcessVariables
): Promise<void> {
  try {
    await axios.post(
      `${ORCHESTRATOR_URL}/api/procesos/${processInstanceId}/completar-tarea`,
      {
        variables,
      },
      {
        timeout: 10000,
      }
    );
  } catch (error: any) {
    console.error('Error al completar tarea en Camunda:', error.message);
    throw new Error(
      `Error al completar tarea en Camunda: ${error.response?.data?.error || error.message}`
    );
  }
}






