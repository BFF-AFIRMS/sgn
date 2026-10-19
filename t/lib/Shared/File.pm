use Excel::Writer::XLSX;

sub csv_to_xlsx {
    my ($csv_content, $xlsx_filepath) = @_;
    my $workbook  = Excel::Writer::XLSX->new($xlsx_filepath);
    my $worksheet = $workbook->add_worksheet();
    my @csv_lines = split("\n", $csv_content);

    my $row = 0;
    foreach my $line (@csv_lines) {
        if (!$line) { next; }
        my @record = split(",", $line);
        my $col = 0;
        foreach my $value (@record) {
            $worksheet->write( $row, $col, $value );
            $col++;
        }
        $row++;
    }
    $workbook->close();
}

1;
