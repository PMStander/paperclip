/**
 * Script to update all agents to have the same adapter, permissions, and fallback adapter as the CEO agent.
 * 
 * Usage: npx tsx scripts/update-agents-like-ceo.ts
 */

const API_BASE = 'http://localhost:3100/api';

interface Agent {
  id: string;
  companyId: string;
  name: string;
  role: string;
  adapterType: string;
  adapterConfig: Record<string, any>;
  permissions: Record<string, any>;
}

interface AgentConfiguration {
  id: string;
  adapterType: string;
  adapterConfig: Record<string, any>;
  permissions: Record<string, any>;
}

async function fetchAgents(companyId: string): Promise<Agent[]> {
  const response = await fetch(`${API_BASE}/companies/${companyId}/agents`);
  if (!response.ok) {
    throw new Error(`Failed to fetch agents: ${response.statusText}`);
  }
  return response.json();
}

async function fetchAgentConfiguration(agentId: string): Promise<AgentConfiguration> {
  const response = await fetch(`${API_BASE}/agents/${agentId}/configuration`);
  if (!response.ok) {
    throw new Error(`Failed to fetch agent configuration: ${response.statusText}`);
  }
  return response.json();
}

async function updateAgent(agentId: string, data: Partial<Agent>): Promise<void> {
  const response = await fetch(`${API_BASE}/agents/${agentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update agent ${agentId}: ${error}`);
  }
}

async function updateAgentPermissions(agentId: string, permissions: Record<string, any>): Promise<void> {
  const response = await fetch(`${API_BASE}/agents/${agentId}/permissions`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(permissions),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update agent permissions ${agentId}: ${error}`);
  }
}

async function main() {
  try {
    console.log('Fetching companies...');
    const companiesResponse = await fetch(`${API_BASE}/companies`);
    if (!companiesResponse.ok) {
      throw new Error(`Failed to fetch companies: ${companiesResponse.statusText}`);
    }
    const companies = await companiesResponse.json();
    
    if (companies.length === 0) {
      console.log('No companies found.');
      return;
    }
    
    const companyId = companies[0].id;
    console.log(`Using company: ${companies[0].name} (${companyId})`);
    
    // Fetch all agents
    console.log('\nFetching agents...');
    const agents = await fetchAgents(companyId);
    console.log(`Found ${agents.length} agents`);
    
    // Find CEO agent
    const ceoAgent = agents.find(a => a.role === 'ceo');
    if (!ceoAgent) {
      console.log('No CEO agent found.');
      return;
    }
    
    console.log(`\nCEO Agent: ${ceoAgent.name} (${ceoAgent.id})`);
    
    // Fetch CEO's full configuration
    console.log('Fetching CEO configuration...');
    const ceoConfig = await fetchAgentConfiguration(ceoAgent.id);
    
    console.log('\nCEO Configuration:');
    console.log('  Adapter Type:', ceoConfig.adapterType);
    console.log('  Adapter Config:', JSON.stringify(ceoConfig.adapterConfig, null, 4));
    console.log('  Permissions:', JSON.stringify(ceoConfig.permissions, null, 4));
    
    // Validate permissions
    if (typeof ceoConfig.permissions.canCreateAgents !== 'boolean') {
      console.log('\nWARNING: CEO permissions.canCreateAgents is not a boolean:', ceoConfig.permissions.canCreateAgents);
      console.log('Setting to true as default');
      ceoConfig.permissions.canCreateAgents = true;
    }
    
    // Extract non-secret parts of adapterConfig
    const safeAdapterConfig: Record<string, any> = {};
    
    // Copy non-secret configuration
    if (ceoConfig.adapterConfig.model !== undefined) {
      safeAdapterConfig.model = ceoConfig.adapterConfig.model;
    }
    if (ceoConfig.adapterConfig.search !== undefined) {
      safeAdapterConfig.search = ceoConfig.adapterConfig.search;
    }
    if (ceoConfig.adapterConfig.fallbackAdapterType !== undefined) {
      safeAdapterConfig.fallbackAdapterType = ceoConfig.adapterConfig.fallbackAdapterType;
    }
    if (ceoConfig.adapterConfig.fallbackAdapterConfig !== undefined) {
      safeAdapterConfig.fallbackAdapterConfig = ceoConfig.adapterConfig.fallbackAdapterConfig;
    }
    if (ceoConfig.adapterConfig.dangerouslyBypassApprovalsAndSandbox !== undefined) {
      safeAdapterConfig.dangerouslyBypassApprovalsAndSandbox = ceoConfig.adapterConfig.dangerouslyBypassApprovalsAndSandbox;
    }
    
    console.log('\nSafe Adapter Config (without secrets):');
    console.log(JSON.stringify(safeAdapterConfig, null, 4));
    
    // Update all non-CEO agents
    const otherAgents = agents.filter(a => a.role !== 'ceo');
    console.log(`\nUpdating ${otherAgents.length} non-CEO agents...`);
    
    let updated = 0;
    let failed = 0;
    
    for (const agent of otherAgents) {
      try {
        console.log(`\nUpdating ${agent.name} (${agent.id})...`);
        
        // Update adapter type and config (without secrets)
        await updateAgent(agent.id, {
          adapterType: ceoConfig.adapterType,
          adapterConfig: safeAdapterConfig,
        });
        
        // Update permissions
        await updateAgentPermissions(agent.id, ceoConfig.permissions);
        
        console.log(`  ✓ Updated successfully`);
        updated++;
      } catch (error) {
        console.error(`  ✗ Failed: ${error instanceof Error ? error.message : error}`);
        failed++;
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Update complete!`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Total: ${otherAgents.length}`);
    console.log(`${'='.repeat(60)}`);
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
