# AIRGUARD: VIVA VOCE EXAMINATION QUESTIONS & ANSWERS

This document compiles **28 comprehensive questions and technical answers** tailored for college viva voce examinations, project reviews, and academic evaluations for the AirGuard project.

---

### Section 1: Data Science Fundamentals & Preprocessing

#### Q1. What is the core objective of the AirGuard project?
**Answer:** AirGuard is an end-to-end data science and machine learning system engineered to analyze historical ambient air pollution data, forecast next-day fine particulate matter ($\text{PM}_{2.5}$) concentrations using chronological time-series regression, classify air quality categories without data leakage, and discover multi-pollutant environmental patterns using unsupervised clustering.

#### Q2. Why is PM2.5 singled out as the primary target for predictive regression?
**Answer:** Fine particulate matter with an aerodynamic diameter $\le 2.5\,\mu\text{m}$ ($\text{PM}_{2.5}$) penetrates deeply into the pulmonary alveoli and enters the bloodstream, making it the most lethal and health-critical ambient pollutant according to WHO guidelines. It also exhibits strong temporal autocorrelation, making it suitable for predictive lag modeling.

#### Q3. How does AirGuard handle missing values without fabricating data?
**Answer:** AirGuard preserves raw data intact and performs cleaning in memory on working copies. For exploratory data analysis (EDA), missing values are reported as explicit counts and percentages per feature. For machine learning pipelines, a `SimpleImputer` computes median values from the training split and applies them to missing records, flagging imputed entries to the user during inference.

#### Q4. What is the Interquartile Range (IQR) method and how is it used in AirGuard?
**Answer:** IQR is a robust non-parametric measure of statistical dispersion calculated as $\text{IQR} = Q_3 - Q_1$, where $Q_1$ is the 25th percentile and $Q_3$ is the 75th percentile. Outlier boundaries are defined as:
$$\text{Lower Bound} = Q_1 - 1.5 \times \text{IQR}, \quad \text{Upper Bound} = Q_3 + 1.5 \times \text{IQR}$$
Observations beyond these limits are identified as statistical outliers caused by acute episodic pollution spikes (e.g., agricultural crop burning or winter thermal inversions).

#### Q5. Why is standardizing column names important in environmental data science?
**Answer:** CAAQMS datasets from various agencies or Kaggle mirrors use inconsistent nomenclature (e.g., `pm2.5`, `PM25`, `pm2_5`, `City`, `city`, `Date`, `timestamp`). AirGuard's `standardize_columns()` function normalizes case and aliases into unified identifiers, ensuring downstream ML scripts execute reliably without user code modification.

---

### Section 2: Time-Series Regression & Lag Features

#### Q6. What is target leakage and how is it avoided in PM2.5 forecasting?
**Answer:** Target leakage occurs when information from the target variable or the future is inadvertently introduced into feature inputs during model training. In AirGuard:
1. Target is strictly shifted to the next day: $\text{Target} = \text{PM}_{2.5}[t+1]$.
2. Features use only current or past values ($\text{PM}_{2.5}[t]$, $\text{PM}_{2.5}[t-1]$, $\text{PM}_{2.5}[t-2]$, and 3-day rolling mean $\text{PM}_{2.5}[t-3 \dots t-1]$).
3. The future target $\text{PM}_{2.5}[t+1]$ is never included among the input predictors.

#### Q7. Why is chronological train-test splitting used instead of random K-fold cross-validation?
**Answer:** Atmospheric observations are sequentially autocorrelated time series. Random K-fold splitting shuffles data randomly, allowing the model to train on day $t+1$ and test on day $t$. This leaks future trend and seasonal information backwards, producing deceptively high $R^2$ scores that fail in production. AirGuard strictly splits the first 80% chronologically for training and the final 20% for testing.

#### Q8. Why did you use Linear Regression as a baseline?
**Answer:** Ordinary Least Squares (OLS) Linear Regression is a simple, transparent parametric algorithm that establishes a benchmark for minimum expected performance. Comparing Random Forest against this baseline demonstrates whether nonlinear feature interactions justify the added complexity of an ensemble model.

#### Q9. Explain the evaluation metrics: MAE, RMSE, and R².
**Answer:**
- **Mean Absolute Error (MAE):** Average magnitude of absolute errors: $\frac{1}{n}\sum |y_i - \hat{y}_i|$. It is linear and easily interpreted in the original unit ($\mu\text{g/m}^3$).
- **Root Mean Squared Error (RMSE):** Square root of the mean squared errors: $\sqrt{\frac{1}{n}\sum (y_i - \hat{y}_i)^2}$. It penalizes large errors more heavily due to the squaring term.
- **Coefficient of Determination ($R^2$):** Proportion of variance in the dependent variable predictable from the independent features: $1 - \frac{\text{SS}_{\text{res}}}{\text{SS}_{\text{tot}}}$. A score of 1.0 indicates perfect prediction.

#### Q10. What are residual plots and what do they indicate?
**Answer:** A residual is the prediction error: $e_i = y_i - \hat{y}_i$. A residual plot displays residuals against zero. If residuals are normally distributed with zero mean and constant variance (homoscedasticity), the model has captured the underlying pattern well. If funneling or skew is visible, it highlights systematic under-prediction of extreme events.

---

### Section 3: Air Quality Classification & Leakage Prevention

#### Q11. What is the fatal target leakage flaw in predicting AQI categories, and how does AirGuard prevent it?
**Answer:** The Air Quality Index (AQI) category (e.g., `Good`, `Moderate`, `Severe`) is directly calculated by an official mathematical formula from the continuous `AQI` score. If a model uses `AQI` as an input feature to predict the category, it is merely learning an identity lookup table, not performing genuine environmental prediction. AirGuard strictly removes `AQI` from input features, requiring the classifier to predict health categories solely from raw ambient pollutant concentrations ($\text{PM}_{2.5}$, $\text{PM}_{10}$, $\text{NO}_2$, $\text{SO}_2$, $\text{CO}$, $\text{O}_3$).

#### Q12. How does AirGuard handle class imbalance in air quality categories?
**Answer:** Severe pollution days (`Severe` or `Very Poor`) are less frequent in annual records than `Moderate` or `Satisfactory` days. AirGuard uses `class_weight='balanced'` in `RandomForestClassifier`. This adjusts weights inversely proportional to class frequencies:
$$w_j = \frac{n}{k \times n_j}$$
ensuring the model does not ignore rare, high-severity events.

#### Q13. Explain Precision, Recall, and F1-Score in the context of air quality.
**Answer:**
- **Precision:** Of all days predicted as `Severe`, what fraction was genuinely `Severe`? (Low precision means excessive false alarms).
- **Recall (Sensitivity):** Of all actual `Severe` days, what fraction did the model correctly identify? (Low recall means failing to alert the public during a hazardous pollution event).
- **F1-Score:** Harmonic mean of precision and recall: $2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$. It provides a balanced assessment under class imbalance.

#### Q14. What is a Confusion Matrix?
**Answer:** An $N \times N$ matrix where rows represent actual true classes and columns represent model predicted classes. The principal diagonal records correct classifications (True Positives), while off-diagonal elements expose specific confusion patterns between adjacent severity categories (e.g., confusing `Moderate` with `Satisfactory`).

---

### Section 4: Unsupervised Clustering & Anomaly Detection

#### Q15. Why is feature scaling mandatory prior to K-Means clustering?
**Answer:** K-Means computes Euclidean distances: $d(p, q) = \sqrt{\sum (p_i - q_i)^2}$. Pollutants measured on large numeric scales (e.g., $\text{PM}_{10}$ up to $500\,\mu\text{g/m}^3$) would dominate pollutants measured on small scales (e.g., $\text{CO}$ in $1\text{--}5\,\text{mg/m}^3$) by orders of magnitude. `StandardScaler` standardizes each feature to zero mean and unit variance ($\mu=0, \sigma=1$).

#### Q16. How does AirGuard determine the optimal number of clusters ($K$)?
**Answer:** AirGuard evaluates candidate cluster counts $K \in [2, 5]$ using the **Silhouette Coefficient**:
$$s(i) = \frac{b(i) - a(i)}{\max(a(i), b(i))}$$
where $a(i)$ is mean intra-cluster distance and $b(i)$ is mean nearest-cluster distance. The value of $K$ yielding the highest average silhouette score is selected as the optimal cluster count.

#### Q17. What is Principal Component Analysis (PCA) and why is it used here?
**Answer:** PCA is an orthogonal linear transformation that converts high-dimensional correlated features into a smaller number of linearly uncorrelated variables called principal components. AirGuard projects high-dimensional pollutant measurements onto the first two principal components (2D PCA) so users can visually inspect cluster separation on the web interface.

#### Q18. How does Isolation Forest detect anomalies?
**Answer:** Isolation Forest isolates anomalies instead of profiling normal data points. It constructs an ensemble of random decision trees. Because anomalous observations have unusual feature values, they require fewer random splits to isolate and end up with shorter average path lengths in the trees. Observations with path lengths below a threshold are flagged as potential environmental anomalies.

---

### Section 5: Software Architecture & Full-Stack Integration

#### Q19. Why choose FastAPI over Flask or Django for this machine learning backend?
**Answer:**
1. **Asynchronous High Performance:** Built on Starlette and ASGI, matching NodeJS and Go speeds.
2. **Automatic Data Validation:** Deep integration with Pydantic validates input feature dictionaries and data types automatically.
3. **Interactive Documentation:** Automatically generates interactive OpenAPI/Swagger documentation at `/docs`.
4. **Lightweight & Modular:** Avoids heavy relational database dependencies unneeded for file-based ML pipelines.

#### Q20. How are trained models persisted and loaded in production?
**Answer:** Models, feature names, and preprocessing objects (`SimpleImputer`, `StandardScaler`, `PCA`) are serialized as `.joblib` files inside `backend/models/`. In `backend/predict.py`, the service deserializes the artifact, matches input payloads against the saved feature schema, applies the saved imputer, and calls `model.predict()`.

#### Q21. Why is CORS configuration necessary in this project?
**Answer:** The React frontend runs on `http://localhost:5173` (Vite dev server) while the FastAPI backend runs on `http://127.0.0.1:8000`. Browsers enforce Same-Origin Policy (SOP), blocking cross-port API calls by default. `CORSMiddleware` in `backend/main.py` explicitly allows requests from the frontend origin.

#### Q22. How does the frontend handle missing datasets or untrained models?
**Answer:** The frontend polls `GET /api/dataset/status` and `GET /api/model-metrics`. If the dataset is missing, an `EmptyDatasetState` component explains where to place `city_day.csv` in `data/` and provides an upload modal. If models are untrained, prediction cards display an informative prompt to train the model, preventing application crashes or display of fabricated metrics.

---

### Section 6: Critical Thinking & Advanced Questions

#### Q23. Does high Pearson correlation between PM2.5 and AQI imply causation?
**Answer:** No. Correlation ($r$) quantifies linear co-movement between two variables, not causal direction. In this specific case, AQI is mathematically computed from sub-indices where $\text{PM}_{2.5}$ is frequently the dominant driver. The correlation is structural and associative, not an independent physical cause.

#### Q24. What are the key limitations of relying solely on chemical monitoring CAAQMS datasets?
**Answer:** Standard CAAQMS logs omit micrometeorological parameters: planetary boundary layer (PBL) height, wind velocity and direction, ambient air temperature, and relative humidity. Pollutant accumulation often occurs due to atmospheric thermal inversions rather than increased emissions, which chemical measurements alone cannot capture.

#### Q25. How would you improve prediction performance if meteorological data became available?
**Answer:** Incorporating temperature, wind speed, atmospheric pressure, and humidity into the feature matrix would allow the model to learn dispersion dynamics. Furthermore, recurrent architectures such as Bidirectional LSTMs or Temporal Fusion Transformers (TFT) could be introduced for multi-day recursive forecasting.

#### Q26. What happens if a user submits a prediction with missing pollutant values?
**Answer:** In `backend/predict.py`, missing values are imputed using the training set median stored in the saved `SimpleImputer`. The API response explicitly returns `imputed_features: ['SO2', 'CO']`, maintaining transparency so the user knows which values were estimated.

#### Q27. What is the difference between parametric and non-parametric statistics in EDA?
**Answer:** Parametric statistics (mean, standard deviation) assume the data follows a specific theoretical distribution (like normal/Gaussian). Non-parametric statistics (median, interquartile range) make no distributional assumptions and are resistant to extreme skewness and outliers, making them more reliable for real-world environmental data.

#### Q28. What makes AirGuard suitable as an academic data science mini-project?
**Answer:** It demonstrates the complete data science lifecycle: raw dataset discovery, data hygiene and schema standardization, parametric/non-parametric exploratory analysis, leak-free feature engineering, chronological regression, balanced classification, unsupervised clustering, automated test suites, RESTful API design, and a responsive web dashboard without fabricated data.

