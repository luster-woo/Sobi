package com.sobi.support.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * DB 는 AI 계약과 같은 소문자로 저장하고, 자바에서는 enum 으로 다룬다.
 * autoApply 라 JudgementStatus 필드에 자동으로 붙는다.
 */
@Converter(autoApply = true)
public class JudgementStatusConverter implements AttributeConverter<JudgementStatus, String> {

    @Override
    public String convertToDatabaseColumn(JudgementStatus attribute) {
        return attribute == null ? null : attribute.getDbValue();
    }

    @Override
    public JudgementStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : JudgementStatus.from(dbData);
    }
}