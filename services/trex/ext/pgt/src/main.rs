use clap::Parser;
use std::io::{self, Write};

use pgt::{SqlTransformer, TransformationConfig, Dialect};

#[derive(Parser)]
#[command(name = "pgt")]
#[command(about = "Interactive PostgreSQL to Multi-Dialect SQL Transformer")]
#[command(version = "0.1.0")]
struct Cli {
    /// Enable verbose logging
    #[arg(short, long)]
    verbose: bool,

    /// Suppress all output except errors
    #[arg(long)]
    quiet: bool,

    /// Target SQL dialect (hana)
    #[arg(short, long, default_value = "hana")]
    dialect: String,
}

fn main() {
    let cli = Cli::parse();

    // Initialize logging
    init_logging(cli.verbose, cli.quiet);

    // Parse dialect
    let dialect = match Dialect::from_str(&cli.dialect) {
        Ok(d) => d,
        Err(e) => {
            eprintln!("Error: {}", e);
            std::process::exit(1);
        }
    };

    if !cli.quiet {
        println!("PostgreSQL to {} SQL Transformer - Interactive Mode", dialect);
        println!("Type SQL statements and press Enter twice to transform (Ctrl+C to exit)");
        println!();
    }

    // Load default configuration
    let config = TransformationConfig::default();

    // Run interactive mode
    if let Err(e) = interactive_command(&config, dialect) {
        eprintln!("Error: {}", e);
        std::process::exit(1);
    }
}

fn init_logging(verbose: bool, quiet: bool) {
    if quiet {
        return;
    }

    let level = if verbose {
        log::LevelFilter::Debug
    } else {
        log::LevelFilter::Info
    };

    env_logger::Builder::new().filter_level(level).init();
}

fn interactive_command(config: &TransformationConfig, dialect: Dialect) -> Result<(), Box<dyn std::error::Error>> {
    let transformer = SqlTransformer::new(config.clone(), dialect)?;

    loop {
        print!("pg> ");
        io::stdout().flush()?;

        let mut input = String::new();
        let mut line = String::new();

        // Read input until empty line
        loop {
            line.clear();
            match io::stdin().read_line(&mut line) {
                Ok(0) => return Ok(()), // EOF
                Ok(_) => {
                    if line.trim().is_empty() && !input.trim().is_empty() {
                        break;
                    }
                    input.push_str(&line);
                }
                Err(e) => {
                    eprintln!("Error reading input: {}", e);
                    continue;
                }
            }
        }

        if input.trim().is_empty() {
            continue;
        }

        // Transform and display result
        match transformer.transform(&input) {
            Ok(transformed) => {
                println!("{} SQL:", dialect.name().to_uppercase());
                println!("{}", transformed);
                println!();
            }
            Err(e) => {
                eprintln!("Error: {}", e);
                println!();
            }
        }
    }
}
