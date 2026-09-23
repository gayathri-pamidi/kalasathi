from fastapi import APIRouter, status, HTTPException
from app.schemas.pricing import PricingPredictionRequest, PricingPredictionResponse
from app.services.pricing_service import predict_market_price_service

router = APIRouter(tags=["Pricing ML"])


@router.post("/predict", response_model=PricingPredictionResponse, status_code=status.HTTP_200_OK)
def predict_price_endpoint(request: PricingPredictionRequest):
    """
    Predict market price for an artisan product using the trained XGBoost Regressor model.
    The artisan does not need to specify technical ML parameters; missing optional fields
    will automatically use verified business fallbacks and dataset defaults.
    """
    try:
        return predict_market_price_service(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pricing model prediction error: {str(e)}"
        )
