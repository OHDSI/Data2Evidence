const { Octokit } = require("@octokit/rest");

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error("Please set GITHUB_TOKEN environment variable");
  process.exit(1);
}

const octokit = new Octokit({ auth: token });

const projectId = "PVT_kwDOAGRAXc4A2L7H";
const startDateFieldId = "PVTF_lADOAGRAXc4A2L7HzgriLj8";
const endDateFieldId = "PVTF_lADOAGRAXc4A2L7HzgriLkA";
const owner = "ohdsi";
const repo = "d2e";

async function getAllMilestones() {
  try {
    const response = await octokit.rest.issues.listMilestones({
      owner,
      repo,
      state: 'all',
      sort: 'due_on',
      direction: 'asc'
    });

    const milestones = response.data.filter(m => m.due_on);
    console.log(`Found ${milestones.length} milestones`);
    
    return milestones;
  } catch (error) {
    console.error("Failed to fetch milestones:", error.message);
    return [];
  }
}

async function getProjectIssues() {
  try {
    const projectQuery = `
      query($projectId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            id
            title
            items(first: 100) {
              nodes {
                id
                content {
                  ... on Issue { 
                    id
                    number
                    title
                    labels(first: 20) {
                      nodes {
                        name
                      }
                    }
                    milestone {
                      id
                      number
                      title
                      dueOn
                      createdAt
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    const result = await octokit.graphql(projectQuery, { projectId });
    
    if (!result.node) {
      console.log("Project not found or no access");
      return [];
    }
    
    const issues = result.node.items.nodes
      .filter(item => item.content && item.content.number)
      .map(item => ({
        projectItemId: item.id,
        ...item.content
      }));
    
    console.log(`Found ${issues.length} issues in project`);
    
    for (const issue of issues) {
      try {
        const subIssuesResponse = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues', {
          owner,
          repo,
          issue_number: issue.number
        });
        
        if (subIssuesResponse.data && subIssuesResponse.data.length > 0) {
          issue.subIssues = subIssuesResponse.data.map(sub => ({
            number: sub.number,
            title: sub.title
          }));
        }
      } catch (error) {
        if (!error.message.includes('404')) {
          console.log(`Warning: Error checking sub-issues for #${issue.number}: ${error.message}`);
        }
      }
    }
    
    for (const issue of issues) {
      if (issue.subIssues) {
        for (const subIssue of issue.subIssues) {
          const subIssueData = issues.find(i => i.number === subIssue.number);
          if (subIssueData) {
            if (!subIssueData.parentIssues) {
              subIssueData.parentIssues = [];
            }
            subIssueData.parentIssues.push({
              number: issue.number,
              title: issue.title
            });
          }
        }
      }
    }
    
    return issues;
  } catch (error) {
    console.error("Failed to fetch project issues:", error.message);
    return [];
  }
}

function calculateStartDate(milestone, milestones) {
  if (!milestone || !milestone.dueOn) return null;
  
  const currentIndex = milestones.findIndex(m => m.number === milestone.number);
  
  if (currentIndex > 0) {
    return milestones[currentIndex - 1].due_on;
  }
  
  return milestone.createdAt || milestone.dueOn;
}

async function updateProjectItemField(projectItemId, fieldId, value, fieldName) {
  try {
    const dateValue = new Date(value).toISOString().split('T')[0];
    
    const updateMutation = `
      mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $dateValue: Date!) {
        updateProjectV2ItemFieldValue(input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: { date: $dateValue }
        }) { 
          projectV2Item { id } 
        }
      }`;
    
    await octokit.graphql(updateMutation, { 
      projectId, 
      itemId: projectItemId, 
      fieldId, 
      dateValue
    });
  } catch (error) {
    console.log(`Failed to update ${fieldName}: ${error.message}`);
  }
}

async function clearProjectItemField(projectItemId, fieldId, fieldName) {
  try {
    const clearMutation = `
      mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!) {
        clearProjectV2ItemFieldValue(input: {
          projectId: $projectId, itemId: $itemId, fieldId: $fieldId
        }) { projectV2Item { id } }
      }`;
    
    await octokit.graphql(clearMutation, { 
      projectId, 
      itemId: projectItemId, 
      fieldId 
    });
  } catch (error) {
    console.log(`Failed to clear ${fieldName}: ${error.message}`);
  }
}

async function validateSetup() {
  try {
    const user = await octokit.rest.users.getAuthenticated();
    const repoData = await octokit.rest.repos.get({ owner, repo });
    
    const projectQuery = `
      query($projectId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            id
            title
            fields(first: 20) {
              nodes {
                ... on ProjectV2Field {
                  id
                  name
                  dataType
                }
              }
            }
          }
        }
      }
    `;
    
    const result = await octokit.graphql(projectQuery, { projectId });
    if (!result.node) {
      throw new Error("Project not found or no access");
    }
    
    const startField = result.node.fields.nodes.find(f => f.id === startDateFieldId);
    const endField = result.node.fields.nodes.find(f => f.id === endDateFieldId);
    
    if (!startField || !endField) {
      console.log("Date field IDs not found");
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error("Setup validation failed:", error.message);
    return false;
  }
}

async function aggregateParentDates(parentIssue, allIssues, issueDates, milestones) {
  const subIssues = parentIssue.subIssues || [];
  
  if (subIssues.length === 0) {
    return null;
  }
  
  let minStartDate = null;
  let maxEndDate = null;
  let validSubIssuesCount = 0;
  
  for (const subIssue of subIssues) {
    const dates = issueDates.get(subIssue.number);
    
    if (dates && dates.endDate) {
      validSubIssuesCount++;
      
      const effectiveStartDate = dates.startDate || dates.endDate;
      
      if (!minStartDate || new Date(effectiveStartDate) < new Date(minStartDate)) {
        minStartDate = effectiveStartDate;
      }
      
      if (!maxEndDate || new Date(dates.endDate) > new Date(maxEndDate)) {
        maxEndDate = dates.endDate;
      }
    }
  }
  
  if (parentIssue.milestone && parentIssue.milestone.dueOn) {
    const milestoneStartDate = calculateStartDate(parentIssue.milestone, milestones);
    const milestoneEndDate = parentIssue.milestone.dueOn;
    
    if (validSubIssuesCount > 0) {
      if (milestoneStartDate) {
        if (!minStartDate || new Date(milestoneStartDate) < new Date(minStartDate)) {
          minStartDate = milestoneStartDate;
        }
      }
      
      if (!maxEndDate || new Date(milestoneEndDate) > new Date(maxEndDate)) {
        maxEndDate = milestoneEndDate;
      }
    } else {
      minStartDate = milestoneStartDate;
      maxEndDate = milestoneEndDate;
    }
  } else {
    if (validSubIssuesCount === 0) {
      return null;
    }
  }
  
  return minStartDate && maxEndDate ? { startDate: minStartDate, endDate: maxEndDate } : null;
}

async function updateAllIssueDates() {
  const isValid = await validateSetup();
  if (!isValid) {
    console.log("Validation failed");
    return;
  }

  const milestones = await getAllMilestones();
  const issues = await getProjectIssues();
  
  if (milestones.length === 0 || issues.length === 0) {
    console.log("No milestones or issues found");
    return;
  }
  
  console.log("Processing issues...");
  
  let updatedCount = 0;
  let parentUpdatedCount = 0;
  let clearedCount = 0;
  
  const issueDates = new Map();
  
  for (const issue of issues) {
    const hasSubIssues = issue.subIssues && issue.subIssues.length > 0;
    
    if (hasSubIssues) {
      continue;
    }
    
    if (issue.milestone && issue.milestone.dueOn) {
      process.stdout.write('.');
      const startDate = calculateStartDate(issue.milestone, milestones);
      const endDate = issue.milestone.dueOn;
      
      if (startDate) {
        await updateProjectItemField(issue.projectItemId, startDateFieldId, startDate, "Start Date");
      }
      
      await updateProjectItemField(issue.projectItemId, endDateFieldId, endDate, "End Date");
      
      issueDates.set(issue.number, { startDate, endDate });
      updatedCount++;
    }
  }
  
  console.log("\nProcessing parent issues...");
  
  for (const issue of issues) {
    const hasSubIssues = issue.subIssues && issue.subIssues.length > 0;
    
    if (hasSubIssues) {
      process.stdout.write('P');
      const aggregatedDates = await aggregateParentDates(issue, issues, issueDates, milestones);
      
      if (aggregatedDates) {
        await updateProjectItemField(issue.projectItemId, startDateFieldId, aggregatedDates.startDate, "Start Date");
        await updateProjectItemField(issue.projectItemId, endDateFieldId, aggregatedDates.endDate, "End Date");
        
        issueDates.set(issue.number, aggregatedDates);
        parentUpdatedCount++;
      } else {
        await clearProjectItemField(issue.projectItemId, startDateFieldId, "Start Date");
        await clearProjectItemField(issue.projectItemId, endDateFieldId, "End Date");
      }
    }
  }
  
  console.log("\nCleaning up remaining issues...");
  
  for (const issue of issues) {
    const hasSubIssues = issue.subIssues && issue.subIssues.length > 0;
    const hasParents = issue.parentIssues && issue.parentIssues.length > 0;
    
    if (hasSubIssues || (issue.milestone && issue.milestone.dueOn) || hasParents) {
      continue;
    }
    
    process.stdout.write('-');
    await clearProjectItemField(issue.projectItemId, startDateFieldId, "Start Date");
    await clearProjectItemField(issue.projectItemId, endDateFieldId, "End Date");
    clearedCount++;
  }
  
  console.log(`\nCompleted: Updated ${updatedCount} issues, ${parentUpdatedCount} parents, cleared ${clearedCount} issues`);
}

updateAllIssueDates().catch(console.error);
