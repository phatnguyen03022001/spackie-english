## git

git remote add origin git@github.com:phatnguyen03022001/spackie-english.git
git branch -M main
git push -u origin main


 
 find . -type f -name "*.tsx" -exec sh -c 'echo "FILE: {}"; echo "---"; cat "{}"; echo -e "\n\n"' \; > all_code.txt

 find . -type f -name "*.ts" -exec sh -c 'echo "FILE: {}"; echo "---"; cat "{}"; echo -e "\n\n"' \; > all_code.txt


  find . \( -path "./node_modules" -o -path "./.next" -o -path "./dist" -o -path "./.git" -o -path "./.turbo" \) -prune -o \
\( -name "*.tsx" -o -name "*.ts" \) -type f \
-exec sh -c 'echo "========================================"; echo "FILE: {}"; echo "========================================"; cat "{}"; echo -e "\n\n"' \; > all_project_code.txt