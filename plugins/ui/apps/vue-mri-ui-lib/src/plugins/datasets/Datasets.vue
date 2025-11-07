<template>
  <div class="datasets-container">
    <h1>Datasets (Sample)</h1>
    <p>Welcome to the Datasets page.</p>
    
    <div class="datasets-content">
      <div class="card">
        <h3>Available Datasets</h3>
        <p>This section will display available datasets for analysis.</p>
      </div>
      
      <div class="card">
        <h3>Upload Dataset</h3>
        <p>Upload new datasets for processing and analysis.</p>
      </div>
      
      <div class="card">
        <h3>Dataset Management</h3>
        <p>Manage existing datasets, permissions, and metadata.</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Datasets',
  components: {},
  data() {
    return {}
  }
}
</script>

<style scoped>
.datasets-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  color: #333;
  margin-bottom: 1rem;
}

.datasets-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.card {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.card h3 {
  color: #495057;
  margin-bottom: 0.5rem;
}

.card p {
  color: #6c757d;
  line-height: 1.5;
}
</style>