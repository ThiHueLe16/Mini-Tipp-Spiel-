package com.check24.minitippspiel.dto;

public record TrikotClaimRequestDto(
        Long userId,
        String queuePassToken,
        String shippingAddress,
        String trikotSize
) {
}
