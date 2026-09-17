package com.sobi.global.storage;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "file")
public class FileStorageProperties {

    /** 업로드 파일 루트. 로컬 ./uploads, EC2 컨테이너 /app/uploads (호스트 /home/ubuntu/app/uploads 바인드 마운트) */
    private String uploadDir = "./uploads";
}
