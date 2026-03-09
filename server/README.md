 
 find . -type f -name "*.ts" -exec sh -c 'echo "FILE: {}"; echo "---"; cat "{}"; echo -e "\n\n"' \; > all_code.txt