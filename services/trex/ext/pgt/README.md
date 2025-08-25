# PostgreSQL to SQL Transformer

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
pgt = "0.1.0"
```

## Quick Start

```rust
use pgt::SqlTransformer;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let transformer = SqlTransformer::default();
    let duckdb = transformer.transform("SELECT * FROM users LIMIT 10")?;
    println!("Result: {}", duckdb);
    Ok(())
}
```

## Configuration

### Builder Pattern

```rust
use pgt::SqlTransformer;

let transformer = SqlTransformer::builder()
    .with_data_types(true)
    .with_functions(true)
    .with_schema_mapping("public", "myschema")
    .build();

let result = transformer.transform("SELECT NOW() FROM public.users")?;
```

### From Configuration File

```rust
let transformer = SqlTransformer::from_config_file("config.toml")?;
```

Example `config.toml`:
```toml
[data_types]
transform_serial = true
transform_text = true

[functions]
transform_now = true
transform_random = true

[[schema_mappings]]
from = "public"
to = "myschema"
```

## API Methods

- `transform(sql: &str)` - Transform a single SQL statement
- `transform_batch(sqls: Vec<&str>)` - Transform multiple statements
- `transform_detailed(sql: &str)` - Get detailed transformation info
- `validate_hana_compatibility(sql: &str)` - Check HANA compatibility


## Error Handling

```rust
match transformer.transform("INVALID SQL") {
    Ok(result) => println!("Success: {}", result),
    Err(e) => eprintln!("Error: {}", e),
}
```

## Testing

```bash
cargo test
```

## License

Licensed under Apache License 2.0
