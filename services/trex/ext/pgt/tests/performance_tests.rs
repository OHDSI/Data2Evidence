mod common;

use common::*;
use std::time::Instant;

#[tokio::test]
async fn test_transformation_performance() {
    let mut runner = IntegrationTestRunner::new();

    let simple_queries = vec![
        "SELECT NOW()",
        "SELECT * FROM users",
        "SELECT COUNT(*) FROM orders",
        "INSERT INTO test (name) VALUES ('test')",
        "UPDATE users SET name = 'John' WHERE id = 1",
        "DELETE FROM orders WHERE id = 1",
    ];

    let complex_queries = vec![
        r#"
        WITH user_stats AS (
            SELECT
                user_id,
                COUNT(*) AS order_count,
                SUM(total_amount::DECIMAL(10,2)) AS total_spent,
                MAX(created_at) AS last_order
            FROM orders
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY user_id
        )
        SELECT
            u.username::TEXT,
            u.email::VARCHAR,
            COALESCE(us.order_count, 0) AS orders,
            COALESCE(us.total_spent, 0.00) AS spent,
            RANDOM() AS score
        FROM users u
        LEFT JOIN user_stats us ON u.id = us.user_id
        WHERE u.created_at > NOW() - INTERVAL '1 year'
        ORDER BY us.total_spent DESC NULLS LAST
        LIMIT 100
        "#,
        r#"
        CREATE TABLE performance_test (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email VARCHAR(255) UNIQUE,
            data JSON,
            metadata JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            score DECIMAL(10,2),
            tags TEXT[],
            settings JSON
        )
        "#,
        r#"
        SELECT
            p.name::TEXT,
            p.email::VARCHAR,
            p.data::JSON,
            EXTRACT(YEAR FROM p.created_at) AS year,
            EXTRACT(MONTH FROM p.created_at) AS month,
            NOW() AS query_time,
            RANDOM() AS random_score,
            COUNT(*) OVER (PARTITION BY EXTRACT(YEAR FROM p.created_at)) AS yearly_count
        FROM performance_test p
        WHERE p.created_at BETWEEN NOW() - INTERVAL '1 year' AND NOW()
        AND p.name LIKE '%test%'
        ORDER BY p.created_at DESC, RANDOM()
        LIMIT 1000
        "#,
    ];

    println!("Testing transformation performance...\n");

    // Test simple queries
    println!("Simple Queries Performance:");
    let start = Instant::now();
    for (i, sql) in simple_queries.iter().enumerate() {
        let query_start = Instant::now();

        let test = TransformationTest::new(format!("simple_query_{}", i), (*sql).to_string())
            .transformation_only();
        let result = runner.run_test(test).await;

        let duration = query_start.elapsed();
        println!(
            "  Query {}: {:.2}μs - {}",
            i + 1,
            duration.as_micros(),
            if result.transformation_success {
                "✓"
            } else {
                "✗"
            }
        );

        assert!(
            result.transformation_success,
            "Simple query {} failed: {:?}",
            i, result.error
        );
        assert!(
            duration.as_millis() < 100,
            "Simple query {} too slow: {:?}",
            i,
            duration
        );
    }
    let total_simple = start.elapsed();
    println!(
        "  Total simple queries: {:.2}ms\n",
        total_simple.as_millis()
    );

    // Test complex queries
    println!("Complex Queries Performance:");
    let start = Instant::now();
    for (i, sql) in complex_queries.iter().enumerate() {
        let query_start = Instant::now();

        let test = TransformationTest::new(format!("complex_query_{}", i), (*sql).to_string())
            .transformation_only();
        let result = runner.run_test(test).await;

        let duration = query_start.elapsed();
        println!(
            "  Query {}: {:.2}ms - {}",
            i + 1,
            duration.as_millis(),
            if result.transformation_success {
                "✓"
            } else {
                "✗"
            }
        );

        if result.transformation_success {
            println!(
                "    Transformed {} chars -> {} chars",
                sql.len(),
                result.hana_sql.len()
            );
        } else {
            println!("    Error: {:?}", result.error);
        }

        assert!(
            result.transformation_success,
            "Complex query {} failed: {:?}",
            i, result.error
        );
        assert!(
            duration.as_millis() < 1000,
            "Complex query {} too slow: {:?}",
            i,
            duration
        );
    }
    let total_complex = start.elapsed();
    println!(
        "  Total complex queries: {:.2}ms\n",
        total_complex.as_millis()
    );

    // Performance assertions
    assert!(
        total_simple.as_millis() < 500,
        "Simple queries total time too slow"
    );
    assert!(
        total_complex.as_millis() < 5000,
        "Complex queries total time too slow"
    );
}

#[tokio::test]
async fn test_batch_transformation_performance() {
    let mut runner = IntegrationTestRunner::new();

    // Generate a batch of similar queries
    let batch_size = 100;
    let mut batch_tests = Vec::new();

    for i in 0..batch_size {
        let sql = format!(
            "SELECT id, name::TEXT, email::VARCHAR, NOW() AS query_time, RANDOM() AS score FROM users_{} WHERE created_at > NOW() - INTERVAL '{} days'",
            i,
            i % 365 + 1
        );

        batch_tests.push(
            TransformationTest::new(format!("batch_query_{}", i), sql)
                .transformation_only()
                .expect_transformation("CLOB")
                .expect_transformation("NOW()")
                .expect_transformation("RAND()"),
        );
    }

    println!(
        "Testing batch transformation performance with {} queries...",
        batch_size
    );

    let start = Instant::now();
    let results = runner.run_test_suite(batch_tests).await;
    let total_duration = start.elapsed();

    let successful_count = results.iter().filter(|r| r.is_success()).count();
    let avg_time_per_query = total_duration.as_micros() / batch_size as u128;

    println!("Batch Results:");
    println!("  Total time: {:.2}ms", total_duration.as_millis());
    println!(
        "  Successful transformations: {}/{}",
        successful_count, batch_size
    );
    println!("  Average time per query: {:.2}μs", avg_time_per_query);
    println!(
        "  Throughput: {:.0} queries/second",
        1_000_000.0 / avg_time_per_query as f64
    );

    // Performance assertions
    assert_eq!(
        successful_count, batch_size,
        "All batch transformations should succeed"
    );
    assert!(
        avg_time_per_query < 10000,
        "Average transformation time should be under 10ms"
    );
    assert!(
        total_duration.as_secs() < 10,
        "Total batch time should be under 10 seconds"
    );

    // Verify some transformations worked correctly
    let sample_results: Vec<_> = results.iter().take(5).collect();
    for result in sample_results {
        assert!(
            result.transformation_success,
            "Sample result should succeed"
        );
        assert!(
            result.hana_sql.contains("CLOB"),
            "Should contain CLOB transformation"
        );
        assert!(
            result.hana_sql.contains("NOW()"),
            "Should contain NOW() transformation"
        );
        assert!(
            result.hana_sql.contains("RAND()"),
            "Should contain RANDOM() transformation"
        );
    }
}

#[tokio::test]
async fn test_memory_usage_with_large_queries() {
    let mut runner = IntegrationTestRunner::new();

    // Generate a very large query to test memory handling
    let mut large_query = String::from("SELECT ");

    // Add many columns with transformations
    for i in 0..1000 {
        if i > 0 {
            large_query.push_str(", ");
        }
        large_query.push_str(&format!(
            "col_{}::TEXT AS text_col_{}, col_{}::VARCHAR AS varchar_col_{}, NOW() AS time_col_{}, RANDOM() AS random_col_{}",
            i, i, i, i, i, i
        ));
    }

    large_query.push_str(" FROM large_table WHERE created_at > NOW() - INTERVAL '30 days'");

    println!(
        "Testing memory usage with large query ({} characters)...",
        large_query.len()
    );

    let test = TransformationTest::new("large_query_test", large_query)
        .transformation_only()
        .expect_transformation("CLOB")
        .expect_transformation("NOW()")
        .expect_transformation("RAND()");

    let start = Instant::now();
    let result = runner.run_test(test).await;
    let duration = start.elapsed();

    println!("Large Query Results:");
    println!("  Transformation time: {:.2}ms", duration.as_millis());
    println!("  Input size: {} chars", result.postgres_sql.len());
    println!("  Output size: {} chars", result.hana_sql.len());
    println!("  Success: {}", result.is_success());

    assert!(
        result.transformation_success,
        "Large query transformation should succeed"
    );
    assert!(
        duration.as_secs() < 5,
        "Large query should transform in under 5 seconds"
    );

    // Verify transformations worked
    let clob_count = result.hana_sql.matches("CLOB").count();
    let timestamp_count = result.hana_sql.matches("NOW()").count();
    let rand_count = result.hana_sql.matches("RAND()").count();

    println!(
        "  Transformations found: {} CLOB, {} NOW(), {} RAND()",
        clob_count, timestamp_count, rand_count
    );

    assert!(clob_count >= 1000, "Should have many CLOB transformations");
    assert!(
        timestamp_count >= 1000,
        "Should have many NOW transformations"
    );
    assert!(rand_count >= 1000, "Should have many RAND transformations");
}
