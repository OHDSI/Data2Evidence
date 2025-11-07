import { Transform } from "stream";

export default class TrexCsvStreamWriter extends Transform {
    _first = true;
    override _transform(chunk, _encoding, callback) {
        let csvData = "";
        const data = JSON.parse(chunk.toString());
        for (const row of data) {
            // Use keys of object and add as header if this is the very first row
            if (this._first) {
                csvData +=
                    Object.keys(row)
                        .map((e) => `"${e}"`) // Wrap each element in double quotes to handle commas in text
                        .join(",") + "\n";
                this._first = false;
            }

            // Parse data into csv string and add new line at end
            csvData +=
                Object.values(row)
                    .map((e) => `"${e}"`) // Wrap each element in double quotes to handle commas in text
                    .join(",") + "\n";
        }

        this.push(csvData);
        callback();
    }
}
