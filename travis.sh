echo TAG: $TRAVIS_TAG
# echo nexus_auth: ${nexus_auth}

packing(){
    # cd ./demo
    echo $PWD 
	npm install
    # cd ../
    echo -e "\nINSTALL DONE.\n"

    sed -i "s/version = '2.0.0'/version = '${TRAVIS_TAG}'/g"  ./src/config.js

    # cd ./demo
    TRAVIS=true TAG_NAME=$TRAVIS_TAG npm run build:prod
    # cd ../
    echo -e "\nBUILD DONE.\n"
}

upload(){
	# 为了不修改 ci，copy 一份
    echo -e "\nCOPY files...\n"
	cp -r ./build ./videocall-web
   
    echo -e "\nZIP files...\n"
	zip -r $TRAVIS_TAG.zip ./videocall-web
    
    echo -e "\nZIPED files...\n"
    # UPLOAD_PARAMS="-v -F r=releases -F hasPom=false -F e=zip -F g=com.easemob.chatdemo2 -F a=webim -F v="$TRAVIS_TAG" -F p=zip -F file=@"$TRAVIS_TAG".zip -u ci-deploy:Xyc-R5c-SdS-2Qr "
    # UPLOAD_URL="https://hk.nexus.op.easemob.com/nexus/service/local/artifact/maven/content"
    # echo -e "\nUPLOAD ZIP..."
    # echo -e $UPLOAD_PARAMS"\n"$UPLOAD_URL"\n"
	# curl $UPLOAD_PARAMS $UPLOAD_URL

    # curl 
    # -v -F r=releases -F hasPom=false -F e=zip -F g=com.easemob.im.fe.rs -F a=im-console -F v=$TRAVIS_TAG -F p=zip -F file=@console.zip -u ci-deploy:Xyc-R5c-SdS-2Qr 
    # http://hk.nexus.op.easemob.com/nexus/service/local/artifact/maven/content
}


if [ $TRAVIS_TAG ]; then
	echo -e "\n[is a tag] start packing\n"
	packing || exit 1
	upload
else
	echo -e "\n[not a tag] exit packing\n"
fi