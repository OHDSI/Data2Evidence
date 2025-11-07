console.log = s => {
    process.stdout.write(s + "\n");
};

console.error = s => {
    process.stderr.write(s + "\n");
};